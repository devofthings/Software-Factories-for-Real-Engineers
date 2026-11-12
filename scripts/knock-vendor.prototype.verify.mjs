// Live Development acceptance probe. Never prints credentials or signed tokens.
import assert from "node:assert/strict"
import { writeFile } from "node:fs/promises"
const origin = "http://127.0.0.1:5181"
async function select(userId) {
  const response = await fetch(`${origin}/api/switch-user`, { method: "POST", redirect: "manual", body: new URLSearchParams({ userId: String(userId) }) })
  const cookie = response.headers.get("set-cookie").split(";")[0]
  const sessionResponse = await fetch(`${origin}/api/knock-vendor-prototype`, { headers: { Cookie: cookie } })
  assert.equal(sessionResponse.status, 200)
  return { ...await sessionResponse.json(), cookie }
}
async function publicRequest(session, path, body, method = "POST", token = session.token) {
  const response = await fetch(`https://api.knock.app/v1${path}`, {
    method: body ? method : "GET",
    headers: { Authorization: `Bearer ${session.publicKey}`, ...(token ? { "X-Knock-User-Token": token } : {}), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: response.status, body: await response.json() }
}
async function api(session, path, body, method) {
  const result = await publicRequest(session, path, body, method)
  assert.equal(result.status, 200, JSON.stringify(result.body))
  return result.body
}
const feedPath = s => `/users/${s.recipient}/feeds/${s.channelId}`
async function trigger(session, event) {
  const response = await fetch(`${origin}/api/knock-vendor-prototype`, { method: "POST", headers: { Cookie: session.cookie, Origin: origin }, body: new URLSearchParams({ event }) })
  assert.equal(response.status, 200)
  return response.json()
}
async function poll(session, predicate) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const feed = await api(session, feedPath(session))
    if (predicate(feed)) return feed
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error("Feed did not reach the expected state")
}
const emma = await select(5)
const james = await select(6)
assert.notEqual(emma.recipient, james.recipient)
const missing = await publicRequest(emma, feedPath(emma), undefined, undefined, "")
const wrong = await publicRequest(emma, feedPath(james))
assert.equal(missing.status, 400)
assert.equal(wrong.status, 403)
const before = await api(emma, feedPath(emma))
const jamesBefore = await api(james, feedPath(james))
const reply = await trigger(emma, "reply")
const delivered = await poll(emma, f => f.meta.total_count > before.meta.total_count)
assert.equal((await api(james, feedPath(james))).meta.total_count, jamesBefore.meta.total_count)
const message = delivered.entries.find(item => !before.entries.some(old => old.id === item.id))
assert.ok(message)
await api(emma, "/messages/batch/seen", { message_ids: [message.id] })
const seen = await poll(emma, f => f.entries.find(item => item.id === message.id)?.seen_at)
assert.equal(seen.meta.unread_count, delivered.meta.unread_count)
await api(emma, "/messages/batch/read", { message_ids: [message.id] })
const read = await poll(emma, f => f.entries.find(item => item.id === message.id)?.read_at)
assert.equal(read.meta.unread_count, delivered.meta.unread_count - 1)
const instructor = await select(2)
const category = "cadence-vendor-prototype-enrollment"
const prefPath = `/users/${instructor.recipient}/preferences/default`
const setPreference = enabled => api(instructor, prefPath, { __persistence_strategy__: "merge", categories: { [category]: { channel_types: { in_app_feed: enabled, email: false, push: false } } } }, "PUT")
const initial = await api(instructor, prefPath)
assert.equal(initial.categories[category].channel_types.in_app_feed, false)
const instructorBefore = await api(instructor, feedPath(instructor))
const suppressedRun = await trigger(instructor, "enrollment")
await new Promise(resolve => setTimeout(resolve, 4000))
const off = await api(instructor, feedPath(instructor))
assert.equal(off.meta.total_count, instructorBefore.meta.total_count)
const optedIn = await setPreference(true)
assert.equal(optedIn.categories[category].channel_types.in_app_feed, true)
assert.equal(optedIn.categories[category].channel_types.email, false)
const enabledRun = await trigger(instructor, "enrollment")
const on = await poll(instructor, f => f.meta.total_count > off.meta.total_count)
await setPreference(false)
const report = {
  signedUserTokens: { status: "pass", selectedUsers: [emma.user, james.user], missingTokenStatus: missing.status, crossUserTokenStatus: wrong.status },
  discussionReply: { status: "pass", eventId: reply.event.event_id, recipient: reply.recipient, workflowRunId: reply.run.workflow_run_id, messageId: message.id },
  headlessFeed: { status: "pass", unreadBeforeRead: delivered.meta.unread_count, unreadAfterSeen: seen.meta.unread_count, unreadAfterRead: read.meta.unread_count },
  preferences: { status: "pass", category, offBeforeOptIn: true, offFeedCount: off.meta.total_count, onFeedCount: on.meta.total_count, suppressedRunId: suppressedRun.run.workflow_run_id, enabledRunId: enabledRun.run.workflow_run_id, restoredToOff: true, bootstrap: "Recipient category initialized off before first trigger" },
}
await writeFile("knock-vendor.prototype.results.json", JSON.stringify(report, null, 2) + "\n")
console.log(JSON.stringify(report, null, 2))
