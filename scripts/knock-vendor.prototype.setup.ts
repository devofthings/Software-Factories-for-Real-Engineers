// Throwaway setup. Only publishes the two namespaced workflows in Development.
import { loadEnv } from "vite"
import { readFile, writeFile } from "node:fs/promises"
const env = { ...loadEnv("development", process.cwd(), "KNOCK_"), ...process.env }
if (!env.KNOCK_SERVICE_TOKEN) throw new Error("Save KNOCK_SERVICE_TOKEN in .env first")
async function management(path: string, body?: unknown) {
  const response = await fetch(`https://control.knock.app/v1${path}`, {
    method: body ? "PUT" : "GET",
    headers: { Authorization: `Bearer ${env.KNOCK_SERVICE_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(`Management API HTTP ${response.status}: ${await response.text()}`)
  return response.json()
}
const channels = await management("/channels?limit=100")
const channel = channels.entries.find((entry: { type: string }) => entry.type === "in_app_feed")
if (!channel) throw new Error("Create a Knock in-app feed channel in Settings > Channels first")
for (const [suffix, category] of [["reply", "cadence-vendor-prototype-discussion"], ["enrollment", "cadence-vendor-prototype-enrollment"]]) {
  await management(`/preference_categories/${category}`, {})
  await management(`/workflows/cadence-vendor-prototype-${suffix}?environment=development&commit=true&commit_message=Cadence%20vendor%20prototype`, {
    workflow: {
      name: `Cadence vendor prototype ${suffix}`, categories: [category],
      description: "Throwaway vendor-fit spike. In-app feed only. Replays existing Cadence database events.",
      steps: [{ type: "channel", ref: "feed", channel_key: channel.key,
        template: { markdown_body: "{{ data.title }} from {{ actor.name }}", action_url: "{{ data.href }}" } }],
    },
  })
}
let local = await readFile(".env", "utf8")
local = local.replace(/^KNOCK_VENDOR_FEED_CHANNEL_ID=.*\n?/gm, "")
await writeFile(".env", `${local.trimEnd()}\nKNOCK_VENDOR_FEED_CHANNEL_ID=${channel.id}\n`, { mode: 0o600 })
console.log(JSON.stringify({ channelId: channel.id, channelKey: channel.key, workflows: ["cadence-vendor-prototype-reply", "cadence-vendor-prototype-enrollment"], environment: "development" }, null, 2))
