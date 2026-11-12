# Previous project notification map

Archived before adopting Matt Pocock's completed reference on November 12, 2026. This records the earlier scope and is superseded by [the adopted map](map.md).

## Destination

A spec (PRD issue) for production-grade Notifications in Cadence, delivered through one hosted third-party vendor. It covers the vendor, the notification catalogue across all four roles, which channel each Notification goes out on (the Notification Feed plus web push and/or email), user preferences, and how the Notification Feed looks and behaves in the app.

## Notes

- Domain: Cadence app (`app/`). Use the language in `GLOSSARY.md`: **Notification** and **Notification Feed** were added for this effort, and the recipients are Student, Instructor, Platform Admin and Team Admin.
- Production grade: real per-user security against the vendor (signed user tokens etc.). It must still work with whichever user the DevUI switcher selects.
- Hosted vendor only. Never self-host.
- The vendor must have a free tier usable in development. We build the Notification Feed UI ourselves, so the vendor's React components don't matter, but a headless feed API does.
- Sign up for as few services as possible: pick one sensible vendor, then prototype against it. No bake-off.
- There's no mobile app, so "push" means browser web push.
- Default skills for grilling tickets: `grilling` + `domain-modeling`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->
- [Which hosted notification vendor fits Cadence?](https://github.com/devofthings/Software-Factories-for-Real-Engineers/issues/10): Knock — free 10K msgs/mo, mandatory RS256 signed user tokens, category × channel prefs, headless feed API; web push via FCM, paid tier jumps to $250/mo
- [How far can web push reach without a native app?](https://github.com/devofthings/Software-Factories-for-Real-Engineers/issues/11): Email is the default out-of-app channel; web push is an extra opt-in channel only (iOS needs a Home Screen web app install, prompts need a user gesture, delivery is best-effort); MagicBell and SuprSend support it natively
- [Which Notifications does Cadence send, and to whom?](https://github.com/devofthings/Software-Factories-for-Real-Engineers/issues/12): 7 Notifications in v1, all caused by someone else: Refund Request approved/declined → buyer; new Open Refund Request → all Platform Admins; Claimed Seat → Team Admin; new Enrollment → Instructor (off by default, opt-in); Discussion Question → Instructor; Discussion Reply → question author. No ratings, new lessons or edits
- [Pick the notification vendor](https://github.com/devofthings/Software-Factories-for-Real-Engineers/issues/13): Knock, provisional until the Knock prototype passes; Courier is the fallback; Firebase/email-provider sign-ups wait on the channel decision; $250/mo cliff accepted

- [Sign up for the notification vendor and provision dev keys](https://github.com/devofthings/Software-Factories-for-Real-Engineers/issues/14): Knock Development credentials saved locally, server authentication and RS256 user-token enforcement verified, ready for the prototype.

- [Which channels does each Notification go out on?](https://github.com/devofthings/Software-Factories-for-Real-Engineers/issues/15#issuecomment-6819978361): V1 includes the Notification Feed, email, and opt-in web push. Refund and discussion updates use all three, Seat claims use feed and push, and Enrollment is feed-only and off by default.

- [Does Knock hold up against Cadence?](https://github.com/devofthings/Software-Factories-for-Real-Engineers/issues/18#issuecomment-6820804869): Knock confirmed after all four live prototype checks passed and the human accepted the result.

## Not yet specified

- **Where Notifications live**: whether we also store them in our own SQLite database or only in the vendor.
- **Triggering**: where in the code each Notification is fired, whether that happens inline or deferred, and what happens when the vendor call fails (idempotency, retries).
- **Testing**: how vitest exercises Notification triggering without hitting the vendor.
- **Refund payout Notifications**: Notifications for Pending, Issued and Failed Refunds, once Cadence tracks payouts (it doesn't today). Failed Refund → buyer is the likely first one.
- **Writing the PRD**: bringing the decisions together into the final spec issue.

## Out of scope

- Native mobile apps (and native mobile push)
- Self-hosting a notification vendor
- Building our own delivery infrastructure
- SMS and chat channels (Slack etc.)
