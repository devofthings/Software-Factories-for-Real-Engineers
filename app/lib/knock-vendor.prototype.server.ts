// Throwaway vendor-fit spike. Replays existing catalogue events against Knock Development.
import Knock from "@knocklabs/node"
import { sign } from "node:crypto"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import { getSqlite } from "~/db"
import { getCurrentUserId } from "~/lib/session"

const config = () => ({ ...parseEnv(readFileSync(".env", "utf8")), ...process.env })
export const recipientId = (id: number) => `cadence-vendor-prototype-${id}`
export const workflowKeys = { reply: "cadence-vendor-prototype-reply", enrollment: "cadence-vendor-prototype-enrollment" }
export const enrollmentCategory = "cadence-vendor-prototype-enrollment"
export function vendor() {
  const env = config()
  if (!env.KNOCK_API_KEY?.startsWith("sk_test_")) throw new Error("A Knock Development secret key is required")
  return new Knock({ apiKey: env.KNOCK_API_KEY })
}

export async function session(request: Request) {
  if (!import.meta.env.DEV) throw new Response("Not found", { status: 404 })
  const id = await getCurrentUserId(request)
  if (!id) throw new Response("Select a user from the DevUI panel", { status: 401 })
  const user = getSqlite().prepare("select id, name, role from users where id = ?").get(id) as { id: number, name: string, role: string } | undefined
  if (!user) throw new Response("User not found", { status: 401 })
  const env = config()
  if (!env.KNOCK_PUBLIC_API_KEY || !env.KNOCK_SIGNING_KEY || !env.KNOCK_VENDOR_FEED_CHANNEL_ID) throw new Response("Run npm run prototype:knock:setup first", { status: 503 })
  const recipient = recipientId(id)
  const sdk = vendor()
  await sdk.users.update(recipient, { name: user.name })
  const preferences = await sdk.users.getPreferences(recipient, "default")
  if (!Object.hasOwn(preferences.categories ?? {}, enrollmentCategory)) {
    await sdk.users.setPreferences(recipient, "default", {
      __persistence_strategy__: "merge",
      categories: { [enrollmentCategory]: { channel_types: { in_app_feed: false, email: false, push: false } } },
    })
  }
  const iat = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(JSON.stringify({ sub: recipient, iat, exp: iat + 900 })).toString("base64url")
  const pem = env.KNOCK_SIGNING_KEY.includes("BEGIN") ? env.KNOCK_SIGNING_KEY.replaceAll("\\n", "\n") : Buffer.from(env.KNOCK_SIGNING_KEY, "base64").toString()
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), pem).toString("base64url")
  return { user, recipient, publicKey: env.KNOCK_PUBLIC_API_KEY, channelId: env.KNOCK_VENDOR_FEED_CHANNEL_ID, token: `${header}.${payload}.${signature}` }
}

export async function trigger(request: Request) {
  const current = await session(request)
  if (request.headers.get("Origin") !== new URL(request.url).origin) throw new Response("Forbidden", { status: 403 })
  const form = await request.formData()
  const sdk = vendor()
  let event: { actor_id: number, actor_name: string, href: string, title: string, event_id: number }
  const enrollment = form.get("event") === "enrollment"
  if (enrollment) {
    const row = getSqlite().prepare(`select e.id event_id, u.id actor_id, u.name actor_name, c.id course_id
      from enrollments e join courses c on c.id=e.course_id join users u on u.id=e.user_id
      where c.instructor_id=? and e.user_id<>? limit 1`).get(current.user.id, current.user.id) as { event_id: number, actor_id: number, actor_name: string, course_id: number } | undefined
    if (!row || current.user.role !== "instructor") throw new Response("Select an Instructor with an Enrollment", { status: 422 })
    event = { ...row, href: `/instructor/${row.course_id}/students`, title: "A Student enrolled in your Course" }
  } else {
    const row = getSqlite().prepare(`select r.id event_id, u.id actor_id, u.name actor_name, l.id lesson_id, c.slug
      from comments r join comments q on q.id=r.parent_id join users u on u.id=r.user_id
      join lessons l on l.id=q.lesson_id join modules m on m.id=l.module_id join courses c on c.id=m.course_id
      where q.user_id=? and r.user_id<>q.user_id and q.parent_id is null and q.deleted_at is null and r.deleted_at is null limit 1`).get(current.user.id) as { event_id: number, actor_id: number, actor_name: string, lesson_id: number, slug: string } | undefined
    if (!row) throw new Response("Select Emma Wilson or James Park to replay an existing Discussion Reply", { status: 422 })
    event = { ...row, href: `/courses/${row.slug}/lessons/${row.lesson_id}`, title: "A Discussion Reply to your question" }
  }
  const actor = recipientId(event.actor_id)
  await sdk.users.update(actor, { name: event.actor_name })
  const run = await sdk.workflows.trigger(enrollment ? workflowKeys.enrollment : workflowKeys.reply, {
    recipients: [current.recipient], actor,
    data: { title: event.title, href: event.href, event_id: event.event_id, prototype: true },
  })
  return { recipient: current.recipient, event, run }
}
