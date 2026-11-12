// Throwaway vendor bridge for the Notification Feed design decision.
import { sign } from "node:crypto"
import { loadEnv } from "vite"
import { getSqlite } from "~/db"
import { getCurrentUserId } from "~/lib/session"

export const workflowKey = "cadence-notification-feed-prototype"
const env = () => ({ ...loadEnv("development", process.cwd(), "KNOCK_"), ...process.env })

export async function prototypeSession(request: Request) {
  if (!import.meta.env.DEV) throw new Response("Not found", { status: 404 })
  const userId = await getCurrentUserId(request)
  if (!userId) throw new Response("Select a user from the DevUI panel", { status: 401 })
  const user = getSqlite().prepare("select id, name, role from users where id = ?").get(userId) as { id: number, name: string, role: string } | undefined
  if (!user) throw new Response("User not found", { status: 401 })
  return { user, recipient: `cadence-feed-prototype-${user.id}` }
}

export async function knock(path: string, body?: unknown) {
  const config = env()
  if (!config.KNOCK_API_KEY?.startsWith("sk_test_")) throw new Error("This prototype requires a Knock development secret key")
  const response = await fetch(`https://api.knock.app/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${config.KNOCK_API_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(`Knock returned ${response.status}: ${await response.text()}`)
  return response.json()
}

export async function clientSession(request: Request) {
  const { user, recipient } = await prototypeSession(request)
  const config = env()
  if (!config.KNOCK_FEED_CHANNEL_ID) throw new Error("Knock feed setup is needed. Run npm run prototype:notifications:setup after adding KNOCK_SERVICE_TOKEN to .env.")
  if (!config.KNOCK_SIGNING_KEY || !config.KNOCK_PUBLIC_API_KEY) throw new Error("Knock development credentials are missing")
  const iat = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(JSON.stringify({ sub: recipient, iat, exp: iat + 900 })).toString("base64url")
  const key = config.KNOCK_SIGNING_KEY.includes("BEGIN") ? config.KNOCK_SIGNING_KEY.replaceAll("\\n", "\n") : Buffer.from(config.KNOCK_SIGNING_KEY, "base64").toString()
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), key).toString("base64url")
  return { recipient, name: user.name, role: user.role, channelId: config.KNOCK_FEED_CHANNEL_ID, publicKey: config.KNOCK_PUBLIC_API_KEY, token: `${header}.${payload}.${signature}` }
}

// Catalogue examples are synthetic. Local course relationships provide valid destinations.
export function sampleNotifications(user: { id: number, role: string }) {
  const db = getSqlite()
  const course = db.prepare(user.role === "instructor"
    ? "select c.*, l.id as lesson_id from courses c join modules m on m.course_id = c.id join lessons l on l.module_id = m.id where c.instructor_id = ? limit 1"
    : "select c.*, l.id as lesson_id from enrollments e join courses c on c.id = e.course_id join modules m on m.course_id = c.id join lessons l on l.module_id = m.id where e.user_id = ? limit 1"
  ).get(user.id) as { title: string, slug: string, lesson_id: number } | undefined
  const team = db.prepare("select id from team_members where user_id = ? and role = 'admin' limit 1").get(user.id)
  const item = (title: string, body: string, href: string, kind: string) => ({ title, body, href, kind })
  if (user.role === "admin") return [
    item("A Refund Request needs review", "A Student submitted a Refund Request. Open Refund Requests to review the Purchase and reason.", "/admin/refunds", "refund"),
    item("Another Refund Request needs review", "A new Refund Request is waiting for a Platform Admin decision.", "/admin/refunds", "refund"),
  ]
  if (user.role === "instructor" && course) return [
    item("A new Discussion Question", `A Student posted a Discussion Question in ${course.title}.`, `/courses/${course.slug}/lessons/${course.lesson_id}`, "discussion"),
    item("A Discussion Reply to your comment", `Someone replied to your top-level comment in ${course.title}.`, `/courses/${course.slug}/lessons/${course.lesson_id}`, "discussion"),
  ]
  const result = team ? [
    item("Your Team License Purchase is confirmed", "Your Seats are ready to share. Manage them on your team page.", "/team", "purchase"),
    item("A Student claimed a Seat", "A Student joined through a Seat on your Team License.", "/team", "seat"),
  ] : []
  if (course) result.push(
    item("Your Purchase is confirmed", `You are enrolled in ${course.title}.`, `/courses/${course.slug}/welcome`, "purchase"),
    item("A Discussion Reply to your comment", `Someone replied to your comment in ${course.title}.`, `/courses/${course.slug}/lessons/${course.lesson_id}`, "discussion"),
    item("Your Refund Request was received", `Your Refund Request for ${course.title} awaits review.`, "/settings", "refund"),
    item("Your Refund Request was approved", `Your Refund Request for ${course.title} was approved. This does not confirm that money has been returned.`, "/settings", "refund"),
  )
  return result
}
