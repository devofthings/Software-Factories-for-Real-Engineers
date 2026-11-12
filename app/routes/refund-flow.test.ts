import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { eq } from "drizzle-orm";
import { createTestDb, seedBaseData } from "~/test/setup";
import {
  courses,
  enrollments,
  purchases,
  refunds,
  RefundStatus,
} from "~/db/schema";
import { setCurrentUserId } from "~/lib/session";
import {
  fakeNotifications,
  type FakeNotifications,
} from "~/lib/notifications.fake.server";
import { sendEmail } from "~/lib/mailer.server";

const testState = vi.hoisted(() => ({
  db: undefined as ReturnType<typeof createTestDb> | undefined,
  notifications: undefined as FakeNotifications | undefined,
}));

vi.mock("~/db", () => ({
  get db() {
    return testState.db;
  },
}));

vi.mock("~/lib/notifications.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/lib/notifications.server")>()),
  defaultNotifications: async () => testState.notifications,
}));

vi.mock("~/lib/mailer.server", () => ({ sendEmail: vi.fn() }));

import { action as requestRefund } from "./courses.$slug.refund";
import { loader as loadCourse } from "./courses.$slug";
import { loader as loadSettings } from "./settings";

describe("refund request journey", () => {
  let db: ReturnType<typeof createTestDb>;
  let base: ReturnType<typeof seedBaseData>;
  let purchase: typeof purchases.$inferSelect;
  let cookie: string;

  function request(path: string, reason?: string) {
    return new Request(`http://localhost${path}`, {
      headers: { Cookie: cookie },
      ...(reason === undefined
        ? {}
        : {
            method: "POST",
            body: new URLSearchParams({
              reason,
              purchaseId: String(purchase.id),
            }),
          }),
    });
  }

  function args(request: Request) {
    return {
      request,
      url: new URL(request.url),
      pattern: "/courses/:slug/refund",
      params: { slug: base.course.slug },
      context: new RouterContextProvider(),
    };
  }

  function submit(reason = "This course does not fit my needs.") {
    return requestRefund(
      args(request(`/courses/${base.course.slug}/refund`, reason))
    );
  }

  beforeEach(async () => {
    db = createTestDb();
    testState.db = db;
    testState.notifications = fakeNotifications();
    vi.mocked(sendEmail).mockReset();
    base = seedBaseData(db);
    db.update(courses)
      .set({ price: 10000 })
      .where(eq(courses.id, base.course.id))
      .run();
    purchase = db
      .insert(purchases)
      .values({
        userId: base.user.id,
        courseId: base.course.id,
        amountPaid: 8000,
        country: "US",
      })
      .returning()
      .get();
    db.insert(enrollments)
      .values({ userId: base.user.id, courseId: base.course.id })
      .run();
    cookie = await setCurrentUserId(
      new Request("http://localhost"),
      base.user.id
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    db.$client.close();
  });

  it("records receipt and a pending request without approving it or removing access", async () => {
    const response = await submit();
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error("Expected a redirect");

    const refundRequest = db.select().from(refunds).get()!;
    expect(refundRequest).toMatchObject({
      purchaseId: purchase.id,
      status: RefundStatus.Open,
      reason: "This course does not fit my needs.",
      amountRefunded: null,
      resolvedAt: null,
    });
    expect(response.headers.get("Location")).toBe("/settings");

    const settings = await loadSettings(
      args(request(response.headers.get("Location")!))
    );
    expect(settings.refundRequests).toMatchObject([
      {
        id: refundRequest.id,
        amountPaid: 8000,
        reason: refundRequest.reason,
      },
    ]);

    const course = await loadCourse(
      args(request(`/courses/${base.course.slug}`))
    );
    expect(course.enrolled).toBe(true);
    expect(course.refundOffer).toBeNull();
    expect(sendEmail).toHaveBeenCalledExactlyOnceWith({
      to: base.user.email,
      subject: expect.stringContaining("Test Course"),
      body: expect.stringContaining("$80.00"),
    });
    expect(testState.notifications!.feedOf(base.user.id)).toMatchObject([
      {
        kind: "refund-requested",
        data: { refundRequestId: refundRequest.id, amount: "$80.00" },
      },
    ]);

    const laterVisit = await loadSettings(args(request("/settings")));
    expect(laterVisit.refundRequests).toHaveLength(1);
  });

  it.each([
    { country: "US", price: 10000 },
    { country: "US", price: 6000 },
    { country: "IN", price: 10000 },
    { country: null, price: 10000 },
  ])(
    "uses the original payment when the price is $price and the country is $country",
    async ({ country, price }) => {
      db.update(purchases)
        .set({ country })
        .where(eq(purchases.id, purchase.id))
        .run();
      db.update(courses)
        .set({ price })
        .where(eq(courses.id, base.course.id))
        .run();

      const course = await loadCourse(
        args(request(`/courses/${base.course.slug}`))
      );
      expect(course.refundOffer).toMatchObject({
        purchaseId: purchase.id,
        amount: 8000,
      });
      await submit();
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.stringContaining("$80.00") })
      );
      const settings = await loadSettings(args(request("/settings")));
      expect(settings.refundRequests[0].amountPaid).toBe(8000);
    }
  );

  it("rejects retries and preserves the original request and confirmation", async () => {
    await submit("The original reason for requesting a refund.");
    const original = db.select().from(refunds).get()!;
    db.update(purchases)
      .set({ createdAt: new Date(Date.now() - 30 * 86400000).toISOString() })
      .where(eq(purchases.id, purchase.id))
      .run();

    await expect(
      submit("Another valid reason for requesting a refund.")
    ).rejects.toMatchObject({
      init: { status: 409 },
    });
    expect(db.select().from(refunds).all()).toEqual([original]);
    expect(sendEmail).toHaveBeenCalledOnce();

    const course = await loadCourse(
      args(request(`/courses/${base.course.slug}`))
    );
    expect(course.refundOffer).toBeNull();
  });

  it("creates only one request and confirmation for simultaneous submissions", async () => {
    const responses = await Promise.allSettled([
      submit("The first reason for a refund request."),
      submit("The second reason for a refund request."),
    ]);
    const saved = db.select().from(refunds).all();
    expect(saved).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(
      responses.filter((response) => response.status === "fulfilled")
    ).toHaveLength(1);
    expect(
      responses.filter((response) => response.status === "rejected")
    ).toMatchObject([{ reason: { init: { status: 409 } } }]);
    expect(testState.notifications!.feedOf(base.user.id)).toHaveLength(1);
  });

  it("returns validation feedback without recording or confirming an invalid request", async () => {
    const response = await submit("too short");
    expect(response).toMatchObject({
      init: { status: 400 },
      data: {
        errors: {
          reason: "Tell us a little more about why you want a refund.",
        },
      },
    });
    expect(db.select().from(refunds).all()).toEqual([]);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(testState.notifications!.sent).toEqual([]);
  });

  it("keeps the closed refund window in force for new requests", async () => {
    db.update(purchases)
      .set({ createdAt: new Date(Date.now() - 30 * 86400000).toISOString() })
      .where(eq(purchases.id, purchase.id))
      .run();
    await expect(submit()).rejects.toMatchObject({ init: { status: 403 } });
    expect(db.select().from(refunds).all()).toEqual([]);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(testState.notifications!.sent).toEqual([]);
  });

  it("does not show or acknowledge another customer's request", async () => {
    await submit();
    const saved = db.select().from(refunds).get()!;
    cookie = await setCurrentUserId(
      new Request("http://localhost"),
      base.instructor.id
    );
    const settings = await loadSettings(
      args(request(`/settings?refund_requested=${saved.id}`))
    );
    expect(settings.refundRequests).toEqual([]);
  });
});
