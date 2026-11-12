# Knock vendor prototype

Throwaway evidence for [Does Knock hold up against Cadence?](https://github.com/devofthings/Software-Factories-for-Real-Engineers/issues/18). Do not merge this branch. The Notification Feed design and production integration are separate decisions.

## Run

Use the isolated worktree at `/tmp/cadence-knock-vendor-prototype`. Its database is a scratch backup of the seeded Cadence database. The original workspace and its feed design prototype are untouched.

1. Run `npm install`.
2. Provide the locally ignored `.env` with `KNOCK_API_KEY`, `KNOCK_PUBLIC_API_KEY`, `KNOCK_SIGNING_KEY`, and `KNOCK_SERVICE_TOKEN`.
3. Run `npm run prototype:knock:setup`. It registers two namespaced categories, publishes two namespaced workflows only in Development, and records `KNOCK_VENDOR_FEED_CHANNEL_ID` locally. An in-app feed channel must already exist.
4. Run `npm run prototype:knock`.
5. Open [Cadence login](http://localhost:5181/login). The seeded Emma Wilson account uses `emma.wilson@student.dev`.
6. Open [the vendor prototype](http://localhost:5181/knock-vendor-prototype).

Use DevUI to switch between Emma Wilson and James Park. Emma has an existing Discussion Question with a Reply by Sarah Chen. Sarah Chen is an Instructor with existing Enrollments. Buttons replay these existing database events through the Knock Node SDK. They do not create comments or Enrollments. Only Knock Development receives these feed messages. Email and web push are not triggered.

The page renders the headless feed and preference state as JSON. Browser calls use the public key and a server-signed RS256 token scoped to the selected recipient for 15 minutes. Refresh the page to renew the token. Switching users remounts the feed state. This proves session switching, not the security of the existing DevUI impersonation mechanism.

## Evidence

Run `node scripts/knock-vendor.prototype.verify.mjs` against the running app for the live acceptance probe. It writes `knock-vendor.prototype.results.json` without credentials or tokens. The probe creates Development messages and updates preferences for namespaced prototype recipients. It restores Enrollment feed preferences to off at the end.

- Signed-token feed access succeeds. A missing token returns HTTP 400. A valid token for another user returns HTTP 403.
- Replaying an existing Discussion Reply through `@knocklabs/node` delivers a feed message to the Question author. Another selected user's feed stays unchanged.
- Headless listing returns counts and entries. Marking seen sets `seen_at` and leaves the unread count unchanged. Marking read sets `read_at` and reduces the unread count.
- Category-by-channel preferences initialize Enrollment off before the first trigger. The off trigger leaves the Instructor feed unchanged during a four-second observation. After opting into the feed, replaying the same Enrollment delivers a message. Email and push preferences remain off. The feed preference is restored to off afterward.
- Browser verification switched DevUI from Emma Wilson to James Park and observed recipient `cadence-vendor-prototype-6` with an empty feed. Emma's messages were absent.

Recipient preference initialization is one feasible default-off mechanism. Knock otherwise defaults unset preferences to on. The production initialization and preference model belong to the later preference and user-sync decisions. Namespaced categories must exist in Knock's preference category catalog before a workflow references them. The setup script registers them first.

## Repository checks

Executed `npm run typecheck` followed by `npm run test`. Typecheck reports eight errors in the existing `app/routes/refund-flow.test.ts`, including references to removed `RefundStatus.Requested` and loader fields. Vitest reports 406 passing tests and nine failures in that same existing refund test file. No prototype file has a typecheck diagnostic. The spike leaves that existing test file unchanged.

The four live vendor checks pass independently of these existing refund failures. This branch is prototype evidence, not a production-ready app change.

## Sources

- [Knock Management API](https://docs.knock.app/developer-tools/management-api)
- [Knock workflow triggering](https://docs.knock.app/send-notifications/triggering-workflows/api)
- [Knock preferences and default behavior](https://docs.knock.app/preferences/overview)
- [Knock feed API](https://docs.knock.app/api-reference/users/feeds/list)
- [Knock signed user authentication](https://docs.knock.app/in-app-ui/security-and-authentication)

Secrets remain only in the original workspace's ignored `.env`, shared locally through a symlink. The prototype service token is named `Cadence vendor prototype` in Knock account settings. It authenticates management requests. It never reaches the browser client or committed evidence.
