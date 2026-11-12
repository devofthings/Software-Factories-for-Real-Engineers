import { useEffect, useState } from "react"
import type { Route } from "./+types/knock-vendor.prototype"
import { session } from "~/lib/knock-vendor.prototype.server"

export async function loader({ request }: Route.LoaderArgs) { return session(request) }

export default function Prototype({ loaderData }: Route.ComponentProps) {
  return <VendorCheck key={loaderData.recipient} current={loaderData} />
}

const enrollmentCategory = "cadence-vendor-prototype-enrollment"

function VendorCheck({ current }: { current: Route.ComponentProps["loaderData"] }) {
  const [state, setState] = useState<unknown>(null)
  const [error, setError] = useState("")
  const headers = { Authorization: `Bearer ${current.publicKey}`, "X-Knock-User-Token": current.token, "Content-Type": "application/json" }
  async function api(path: string, body?: unknown, method = "POST") {
    const response = await fetch(`https://api.knock.app/v1${path}`, { headers, method: body ? method : "GET", body: body ? JSON.stringify(body) : undefined })
    if (!response.ok) throw new Error(`Knock HTTP ${response.status}: ${await response.text()}`)
    return response.json()
  }
  async function refresh() {
    const [feed, preferences] = await Promise.all([
      api(`/users/${current.recipient}/feeds/${current.channelId}`),
      api(`/users/${current.recipient}/preferences/default`),
    ])
    setState({ recipient: current.recipient, feed, preferences })
    return feed
  }
  async function act(action: string) {
    setError("")
    try {
      if (action === "reply" || action === "enrollment") {
        const form = new FormData()
        form.set("event", action)
        const response = await fetch("/api/knock-vendor-prototype", { method: "POST", body: form })
        if (!response.ok) throw new Error(await response.text())
        setState(await response.json())
      } else if (action === "on" || action === "off") {
        await api(`/users/${current.recipient}/preferences/default`, {
          __persistence_strategy__: "merge",
          categories: { [enrollmentCategory]: { channel_types: { in_app_feed: action === "on", email: false, push: false } } },
        }, "PUT")
        await refresh()
      } else if (action === "seen" || action === "read") {
        const feed = await refresh()
        if (feed.entries.length) await api(`/messages/batch/${action}`, { message_ids: feed.entries.map((item: { id: string }) => item.id) })
        await refresh()
      } else await refresh()
    } catch (e) { setError((e as Error).message) }
  }
  useEffect(() => { void act("refresh") }, [])
  return <div className="p-8 space-y-5">
    <h1 className="text-2xl font-bold">Knock vendor prototype</h1>
    <p>Throwaway Development spike. Replays existing database events. This is a vendor check, not the Notification Feed design.</p>
    <p>Current user: <strong>{current.user.name}</strong> ({current.user.role}). Recipient: {current.recipient}.</p>
    <p>Use DevUI to switch users. Emma Wilson and James Park have Discussion Replies. Sarah Chen has Enrollments. Refresh after triggering to observe delivery.</p>
    <div className="flex flex-wrap gap-3">{["refresh", "reply", "enrollment", "seen", "read", "on", "off"].map(action =>
      <button className="border rounded px-3 py-2" key={action} onClick={() => void act(action)}>{({ refresh: "Refresh feed", reply: "Replay Discussion Reply", enrollment: "Replay Enrollment", seen: "Mark seen", read: "Mark read", on: "Opt in to Enrollment feed", off: "Opt out of Enrollment feed" })[action]}</button>
    )}</div>
    {error && <p role="alert">{error}</p>}
    <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(state, null, 2)}</pre>
  </div>
}
