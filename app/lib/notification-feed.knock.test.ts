import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedItem } from "@knocklabs/client";
import { knockNotificationFeed } from "./notification-feed.knock";

const remote = vi.hoisted(() => ({
  items: [] as FeedItem[],
  error: false,
}));

vi.mock("@knocklabs/client", () => ({
  default: class {
    authenticate() {}
    teardown() {}
    feeds = {
      initialize: () => {
        let loaded: FeedItem[] = [];
        return {
          store: { subscribe: () => () => {} },
          listenForUpdates() {},
          dispose() {},
          async fetch() {
            if (remote.error) return { status: "error" };
            loaded = [...remote.items];
            return { status: "success" };
          },
          getState: () => ({
            items: loaded,
            metadata: {
              unseen_count: loaded.length,
              unread_count: loaded.length,
            },
            pageInfo: { after: null },
            networkStatus: "ready",
          }),
        };
      },
    };
  },
}));

const credentials = {
  userId: "5",
  userToken: "test-token",
  publicKey: "test-public-key",
  feedChannelId: "test-channel",
};

beforeEach(() => {
  remote.items = [];
  remote.error = false;
});

describe("refreshing the Knock feed", () => {
  it("removes a server-archived notification without waiting for a new message", async () => {
    remote.items = [
      {
        id: "refund-received",
        __cursor: "cursor-1",
        source: { key: "refund-requested", version_id: "version-1", categories: [] },
        data: {
          refundRequestId: 1,
          courseTitle: "TypeScript",
          amount: "$80.00",
        },
        actors: [],
        blocks: [],
        total_actors: 0,
        tenant: null,
        inserted_at: "2026-11-12T10:00:00Z",
        updated_at: "2026-11-12T10:00:00Z",
        seen_at: null,
        read_at: null,
        clicked_at: null,
        interacted_at: null,
        link_clicked_at: null,
        archived_at: null,
      },
    ];
    const feed = knockNotificationFeed(credentials, async () => null);
    await vi.waitFor(() => expect(feed.getState().status).toBe("ready"));
    expect(feed.getState().notifications).toHaveLength(1);

    remote.items = [];
    await feed.refresh();

    expect(feed.getState()).toMatchObject({
      notifications: [],
      unseenCount: 0,
      unreadCount: 0,
      status: "ready",
    });
    feed.dispose();
  });

  it("recovers from an initial load failure when the feed is reopened", async () => {
    remote.error = true;
    const feed = knockNotificationFeed(credentials, async () => null);
    await vi.waitFor(() => expect(feed.getState().status).toBe("error"));

    remote.error = false;
    await feed.refresh();

    expect(feed.getState().status).toBe("ready");
    feed.dispose();
  });
});
