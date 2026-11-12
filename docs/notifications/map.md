# Wayfinder: In-app notifications for Cadence

> Imported from Matt Pocock's [07-spec-implement snapshot](https://gist.github.com/mattpocock/87be0d1df4945234bba66f775ade6768#file-07-spec-implement-json), captured 2026-10-08T13:53:46Z. This is historical reference material. Source issue numbers, credential setup, manual checks, test counts, and pricing describe Matt's environment. See [our adoption notes](README.md) for current project status.

## Destination

A spec (PRD issue) for production-grade Notifications in Cadence, delivered through one hosted third-party vendor. It covers the vendor, the notification catalogue across all four roles, user preferences, and how the Notification Feed looks and behaves in the app. v1 is Notification Feed only: no email, no web push.

## Notes

- Domain: Cadence app (`app/`). Use the language in `GLOSSARY.md`: **Notification** and **Notification Feed** were added for this effort, and the recipients are Student, Instructor, Platform Admin and Team Admin.
- Production grade: real per-user security against the vendor (signed user tokens etc.). It must still work with whichever user the DevUI switcher selects.
- Hosted vendor only. Never self-host.
- The vendor must have a free tier usable in development. We build the Notification Feed UI ourselves, so the vendor's React components don't matter, but a headless feed API does.
- Sign up for as few services as possible: pick one sensible vendor, then prototype against it. No bake-off.
- There's no mobile app, so "push" means browser web push.
- Leave room for email: nothing in v1 may shut out a later email step. Preferences are category × channel, with only `in_app_feed` used for now.
- **Vendor behind Cadence-owned interfaces.** Only adapters touch Knock. There's a server interface (triggering, preferences, user sync) and a client interface (feed list, counts, mark seen/read, live updates), both in Cadence's language; the adapters map to Knock keys. Swapping vendors means writing new adapters. Set by [How do Notification preferences work in Cadence?](decisions.md#reference-issue-20)
- Default skills for grilling tickets: `grilling` + `domain-modeling`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->
- [Which hosted notification vendor fits Cadence?](decisions.md#reference-issue-13): Knock — free 10K msgs/mo, mandatory RS256 signed user tokens, category × channel prefs, headless feed API; web push via FCM, paid tier jumps to $250/mo
- [How far can web push reach without a native app?](decisions.md#reference-issue-14): Email is the default out-of-app channel; web push is an extra opt-in channel only (iOS needs a Home Screen web app install, prompts need a user gesture, delivery is best-effort); MagicBell and SuprSend support it natively
- [Which Notifications does Cadence send, and to whom?](decisions.md#reference-issue-15): 7 Notifications in v1, all caused by someone else: Refund Request approved/declined → buyer; new Open Refund Request → all Platform Admins; Claimed Seat → Team Admin; new Enrollment → Instructor (off by default, opt-in); Discussion Question → Instructor; Discussion Reply → question author. No ratings, new lessons or edits. *Amended by the channels ticket:* an 8th, Refund Request confirmation → buyer
- [Pick the notification vendor](decisions.md#reference-issue-16): Knock, provisional until the Knock prototype passes; Courier is the fallback; Firebase/email-provider sign-ups wait on the channel decision; $250/mo cliff accepted
- [Sign up for the notification vendor and provision dev keys](decisions.md#reference-issue-17): Knock Development env provisioned. `KNOCK_PUBLIC_API_KEY`, `KNOCK_SECRET_API_KEY`, `KNOCK_SIGNING_KEY` and `KNOCK_FEED_CHANNEL_ID` are in `.env`; enhanced security is on and a signed-token feed call is verified
- [Does Knock hold up against Cadence?](decisions.md#reference-issue-21): Knock confirmed. All four checks pass (DevUI-switched signed tokens, SDK trigger to feed, headless feed list/counts/mark-seen-read, opt-in preference). "Off by default" must be written into each user's own preferences by Cadence; Knock's environment default is dashboard-only and the tenant default didn't work
- [Which channels does each Notification go out on?](decisions.md#reference-issue-18): Feed only in v1, no email or web push. Existing Postmark refund emails stay until Notification email lands. New Notification 8, Refund Request confirmation → buyer: own-action rule gains a "request awaiting someone else's decision" exception
- [What does the Notification Feed look like in Cadence?](decisions.md#reference-issue-19): bell popover in the sidebar header, badge counts unseen; one chronological list with infinite scroll and history kept forever; real sender avatars with a category icon; a ✓ marks a row read; clicking goes to the most specific place; deleted comments' Notifications disappear
- [How do Notification preferences work in Cadence?](decisions.md#reference-issue-20): 6 mutable categories (Refund Request updates, Open Refund Requests, Seat claims, Enrollments, Discussion Questions, Discussion Replies) × channel, feed only; Enrollments off, rest on; switches shown by what the person is or has, not role; a Notifications card on `/settings`, saves on flip by merging into the preference set; no mute-all
- [How does Cadence's Notification plumbing work against Knock?](decisions.md#reference-issue-22): Knock only, no local store; triggers inline after commit, best-effort with idempotency keys; deleted comments archived via `trigger_data` lookup; explicit user sync writes default prefs, admins queried at trigger time; real-time socket + bulk channel status updates; fake adapter in tests, no-op in keyless dev

## Not yet specified

None. The fog is cleared, and the PRD is next.

## Out of scope

- Native mobile apps (and native mobile push)
- Self-hosting a notification vendor
- Building our own delivery infrastructure
- SMS and chat channels (Slack etc.)
- Email as a Notification channel: a follow-up effort, expected soon. The existing direct Postmark refund emails carry on until then ([Which channels does each Notification go out on?](decisions.md#reference-issue-18))
- Web push: a Firebase/FCM sign-up, a service worker, a permission UX and iOS install friction for best-effort delivery ([Which channels does each Notification go out on?](decisions.md#reference-issue-18))
- Refund payout Notifications (Pending, Issued and Failed Refunds): these wait on Cadence tracking Refund payouts, which is a separate effort. Failed Refund → buyer is the likely first one ([How does Cadence's Notification plumbing work against Knock?](decisions.md#reference-issue-22))
