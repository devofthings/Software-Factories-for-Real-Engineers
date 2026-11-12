# PRD: In-app Notifications for Cadence

> Imported from Matt Pocock's [07-spec-implement snapshot](https://gist.github.com/mattpocock/87be0d1df4945234bba66f775ade6768#file-07-spec-implement-json), captured 2026-10-08T13:53:46Z. This is historical reference material. Source issue numbers, credential setup, manual checks, test counts, and pricing describe Matt's environment. See [our adoption notes](README.md) for current project status.

## Problem Statement

People in Cadence can't tell when something that concerns them has happened. To find out, they have to go and look:

- A Student who raised a Refund Request keeps checking back to see whether a Platform Admin has decided it.
- Platform Admins only find a new Open Refund Request by visiting the refunds admin page.
- A Team Admin can't tell when someone claims a Seat, or how many Seats are left.
- An Instructor misses Discussion Questions on their lessons.
- A Student who asked a Discussion Question doesn't know when someone replies.

Today the only out-of-app signal is the pair of direct Postmark refund emails. Cadence has nowhere inside the app to tell someone what's happened.

## Solution

Cadence gets a **Notification Feed**: a bell in the sidebar header that opens a popover listing a person's **Notifications**, newest first.

- **Badge:** counts unseen Notifications and clears when the popover opens.
- **Rows:** each row shows who caused the Notification, what happened and when. Clicking a row marks it read and goes to the most specific place in the app it's about.
- **Live updates:** new Notifications arrive without a page reload.
- **History:** kept forever and reachable by infinite scroll.

In v1 the feed is the only channel. It carries 8 Notifications across the four recipient roles: Student, Instructor, Platform Admin and Team Admin.

Each person controls which **categories** they receive from a new Notifications card on `/settings`. Enrollment Notifications are off by default and opt-in; every other category is on.

Delivery, storage and real-time updates come from one hosted vendor, **Knock**, through signed per-user tokens. The switcher in the DevUI panel keeps working: switching user switches the feed. Only Cadence-owned adapters touch Knock, so the vendor can be swapped later and an email channel can be added without a migration.

## User Stories

### Notification Feed

1. As any signed-in person, I want a bell in the sidebar header next to "Cadence", so that I can always reach my Notifications.
2. As any signed-in person, I want the bell to show a red badge with the number of unseen Notifications, so that I know at a glance that something new has happened.
3. As any signed-in person, I want the badge capped at "9+", so that a big backlog doesn't break the layout.
4. As any signed-in person, I want opening the popover to mark all my Notifications seen and clear the badge, including ones that haven't loaded yet, so that the badge only counts what I haven't looked at.
5. As any signed-in person, I want seen and read to be different things, so that opening the popover doesn't hide what I still need to act on.
6. As any signed-in person, I want one chronological list with the newest first, so that I can read what happened in order.
7. As any signed-in person, I want each row to show the real avatar of the person who caused it, with a small category icon (Discussion, Refund, Team, Enrollment) inset at the corner, so that I can see who it's from and what it's about.
8. As any signed-in person, I want each row to show a title, a one-line snippet or context, and how long ago it arrived, so that I can understand it without clicking.
9. As any signed-in person, I want unread rows to have a bold title and read rows a faded avatar, so that I can tell them apart.
10. As any signed-in person, I want Notifications from Cadence itself, with no sender, to show a Cadence "C" avatar, so that every row has a clear source.
11. As any signed-in person, I want a ✓ on each unread row that marks just that row read, so that I can clear items without leaving the popover.
12. As any signed-in person, I want a "Mark all as read" link in the popover header that also covers Notifications that haven't loaded yet, so that I can clear everything in one go.
13. As any signed-in person, I want clicking a row to mark it read and take me to the most specific place there is, so that I land right where I need to act.
14. As any signed-in person, I want clicking a Notification that has nowhere to go to only mark it read and keep the popover open, so that nothing unexpected happens.
15. As any signed-in person, I want the list to load more as I scroll, so that I can reach my whole history.
16. As any signed-in person, I want read Notifications to stay in the list for good, so that I can find something I've already dealt with.
17. As any signed-in person, I want to see "You're all caught up." when I have no Notifications, so that an empty list doesn't look broken.
18. As any signed-in person, I want new Notifications to appear in the badge and the open popover live, without reloading, so that the feed is always current.
19. As any signed-in person, I want a gear icon in the popover that links to my Notification preferences, so that I can change what I receive.
20. As any signed-in person, I want only ever to see my own Notifications, enforced by a signed token, so that nobody can read someone else's feed.

### Refund Requests

21. As a buyer (a Student, or a Team Admin for a Team Licence), I want a Notification confirming that my Refund Request is under review, naming the course and the amount, so that I know it went through.
22. As a buyer, I want a Notification when my Refund Request is approved, naming the course and Purchase and including the decision note if there is one, so that I know my money is coming back.
23. As a buyer, I want a Notification when my Refund Request is declined, with the decision note and a reminder that I can ask again, so that I know where I stand.
24. As a buyer, I want to keep getting the direct refund emails alongside these Notifications, so that I never lose the email about my money.
25. As a Platform Admin, I want a Notification for every new Open Refund Request, showing who asked, for which course, the amount and the reason, and linking to the refunds admin page, so that I can decide it promptly.
26. As a Platform Admin, I want my Open Refund Request Notification to stay as it is when another Platform Admin decides that request, so that the feed stays a faithful record.
27. As a newly promoted Platform Admin, I want Open Refund Request Notifications from my promotion onwards, so that I share the workload from then on.

### Team Licences

28. As a Team Admin, I want a Notification each time a Student claims a Seat on my Team Licence, showing who claimed it, for which course, and how many Seats are left, so that I can keep track of my licence.

### Enrollments

29. As an Instructor, I want to opt in to a Notification for every new Enrollment on my courses, whether from an Individual Purchase or a Claimed Seat, so that I can follow who joins.
30. As an Instructor, I want Enrollment Notifications off until I turn them on, so that a popular course doesn't flood my feed.
31. As an Instructor, I want a Lapsed Student enrolling again to count as a new Enrollment, so that I see them come back.
32. As an Instructor, I don't want an Enrollment Notification when a Team Licence is bought, so that I'm only told about real Students joining.

### Discussions

33. As an Instructor, I want a Notification for every new Discussion Question on my course's lessons, including ones from Platform Admins, showing who asked, which lesson and a snippet, so that I can answer it.
34. As an Instructor, I don't want a Notification for Discussion Questions I post on my own course, so that I'm not told about my own actions.
35. As the author of a Discussion Question, I want a Notification when someone else replies, showing who replied, which lesson and a snippet, so that I can follow the answer.
36. As the author of a Discussion Question, I don't want a Notification for my own replies to it, so that my feed only shows other people's activity.
37. As anyone else in a thread, I don't want Notifications for replies to someone else's Discussion Question, so that I'm not spammed by threads I didn't start.
38. As the recipient of a Discussion Notification, I want clicking it to take me to that exact comment on the lesson, so that I don't have to hunt for it.
39. As the recipient of a Discussion Notification, I want it to disappear from my feed if the comment is deleted, so that I'm not sent to something that's gone.
40. As the author of a Discussion Reply, I want deleting the Discussion Question above it to leave Notifications about my reply in place, so that Notifications about visible replies survive.
41. As the recipient of a Discussion Notification, I want it to keep the text it had when it was sent even if the comment is edited later, so that the feed is a stable record.

### Preferences

42. As any signed-in person, I want a Notifications card on `/settings`, below Profile, with one switch per category, so that I can control what reaches my feed.
43. As any signed-in person, I want each switch to save as soon as I flip it, with a toast if the save fails, so that I don't need a save button.
44. As any signed-in person, I want to see only the switches that apply to what I am or have, not to my role, so that the card stays relevant.
45. As someone with at least one Purchase, I want a "Refund Request updates" switch covering the confirmation, approval and decline, so that I can mute them together.
46. As a Team Admin on at least one Team Licence, I want a "Seat claims" switch, so that I can mute claim Notifications.
47. As an Instructor, I want "Enrollments" (off by default) and "Discussion Questions" switches, so that I can tune my teaching Notifications.
48. As a Platform Admin, I want an "Open Refund Requests" switch, so that I can mute them if someone else is on duty.
49. As anyone, I want a "Discussion Replies" switch, so that I can mute replies to my questions.
50. As someone who gains a new capability (a first Purchase, say), I want the new switch to appear with its default already in effect, so that nothing needs setting up.
51. As any signed-in person, I want changing one switch to leave my other preferences as they are, so that saving one never resets the rest.

### Identity and sync

52. As any signed-in person, I want my name and avatar in other people's Notifications to stay current after I change them, so that people recognise me.
53. As a new user, I want my default preferences in place from signup, so that Enrollments are off and everything else is on from the start.
54. As an existing user from before this launch, I want a backfill to give me the same defaults, so that I'm treated the same as a new user.

### Developers and operators

55. As a developer, I want switching user in the DevUI panel to tear down the live feed connection and reconnect with that user's signed token, so that I can test any user's feed.
56. As a developer, I want the app to keep working without Knock keys, with Notifications logged instead of sent and an empty feed, so that I can run Cadence locally without signing up.
57. As a developer, I want vitest to run every Notification rule against an in-memory fake without touching Knock, so that tests are fast and run offline.
58. As an operator, I want a Knock failure to be logged and never fail the action that caused it, so that a refund decision, comment or Enrollment always goes through.
59. As an operator, I want each Notification to carry an idempotency key for its domain event, so that a retry layer added later can't send duplicates.
60. As a future developer, I want Knock hidden behind Cadence-owned interfaces, so that switching vendors means writing new adapters and nothing else.
61. As a future developer, I want preferences stored as category × channel, so that adding email later means adding a channel, with no migration.

## Implementation Decisions

### Vendor and storage
- **Knock** is the vendor. It's confirmed by the spike ([reference #21](decisions.md#reference-issue-21)): RS256 signed user tokens, a headless feed API, category × channel preferences, and a free development tier.
- **Notifications live only in Knock.** Cadence doesn't store a copy, and there are no schema changes for Notifications themselves.
- The Development environment is already provisioned. `KNOCK_PUBLIC_API_KEY`, `KNOCK_SECRET_API_KEY`, `KNOCK_SIGNING_KEY` and `KNOCK_FEED_CHANNEL_ID` are in `.env`, and enhanced security is on.
- Vite doesn't expose `.env` variables without the `VITE_` prefix on `process.env` in dev, so the server must load them some other way. The spike called `process.loadEnvFile(".env")`.

### Notification catalogue
The rule: a Notification is about something that concerns the recipient and was caused by someone else, or by the system. The one exception is confirming a request that waits on someone else's decision.

| # | Event | Recipient | Category | Default |
|---|---|---|---|---|
| 1 | Refund Request approved | the buyer | Refund Request updates | On |
| 2 | Refund Request declined | the buyer | Refund Request updates | On |
| 3 | New Open Refund Request | every Platform Admin (`role = admin`) at trigger time | Open Refund Requests | On |
| 4 | Seat claimed | the Team Admin who owns the Team Licence | Seat claims | On |
| 5 | New Enrollment (Individual Purchase or Claimed Seat, including a Lapsed Student re-enrolling; not buying a Team Licence) | the course's Instructor | Enrollments | **Off** |
| 6 | New Discussion Question, from anyone except the course's Instructor | the course's Instructor | Discussion Questions | On |
| 7 | Discussion Reply from someone other than the question's author | the question's author only | Discussion Replies | On |
| 8 | Refund Request confirmation (under review) | the buyer | Refund Request updates | On |

- Each Notification is its own Knock workflow, assigned to its category. A workflow must be **committed** in Knock before its category exists at runtime, and triggering an uncommitted workflow returns 404.
- Each workflow keeps room for a later email step.
- **The text is Cadence's.** Each trigger sends structured data: names, course, lesson, snippet, amount, note, Seats left, link target and comment id. The client writes each row's title and snippet from that data. Knock templates aren't used for text.

### Server Notifications port (the seam)
- A Cadence-owned server interface, modelled on `MailTransport`, covers three things, all in Cadence's language: **triggering** a Notification, **preferences** (read, and merge a change), and **user sync** (identify, plus write default preferences if the user has none). It also covers **archiving** the Notifications caused by a comment.
- **Three adapters:**
  - **Knock:** the only code that imports the Knock SDK or knows Knock's workflow, category and channel keys.
  - **In-memory fake:** records triggers, syncs, preference writes and archives for tests.
  - **No-op:** logs; used when `KNOCK_SECRET_API_KEY` is missing, matching the `.outbox` fallback.
- Services take the port as an injected parameter, like `db` and `now`. Routes pass in the default adapter.
- **Triggers fire inline, after the domain write commits.** A port failure is caught and logged, and never changes the domain result. v1 has no retries.
- **Idempotency key per domain event,** for example `refund-approved:<refundRequestId>`, `refund-requested:<refundRequestId>`, `seat-claimed:<seatId>`, `enrollment:<enrollmentId>` and `discussion-reply:<commentId>`.
- **The recipient is passed inline** (id, name, email, avatar), which creates or updates the Knock user as it sends.
- **The actor is passed** so the sender's avatar resolves. Notification 8 has no actor.

### Services that fire Notifications
- **Refunds** (existing service): raising a Refund Request fires #8 to the buyer and #3 to every Platform Admin. Approving fires #1 and declining fires #2. The direct Postmark refund emails carry on unchanged.
- **Enrollment** (new service, extracted from the purchase route's `enrollUser`): creates the Enrollment and fires #5 to the Instructor. The Seat claim path uses it too.
- **Seat claim** (new service, extracted from the redeem route's `redeemCoupon`): claims the Seat and fires #4 to the Team Admin with the number of Seats left. The Enrollment it grants fires #5 through the Enrollment service.
- **Comments** (new service): replaces the two duplicated `createComment` functions in the lesson route and the instructor questions route.
  - Creating a top-level comment fires #6 unless the author is the course's Instructor.
  - Creating a reply fires #7 to the question's author unless the reply is theirs.
  - Soft-deleting a comment (`deletedAt`) archives the Notifications it caused: #6 for a Discussion Question, #7 for a Discussion Reply. Archiving looks them up by the comment id in the trigger data, using Knock's List Messages `trigger_data` filter.
  - If that filter doesn't work with the secret key, the fallback is a small mapping table from comment id to Knock message id. That would be the one schema change; follow the database-migrations skill.
  - Deleting a Discussion Question leaves its Discussion Reply Notifications in place.
  - Editing a comment changes no Notification.

### Preferences
- **Six categories × channel.** Only the feed channel (Cadence's `feed`, mapped by the adapter to Knock's `in_app_feed`) is used in v1. There's no mute-all.
- **Defaults:** Enrollments off, everything else on. These are written into each user's own Knock `default` preference set by user sync, and only if the user has none yet. Knock's environment default is dashboard-only, and the tenant default didn't suppress delivery in the spike.
- **Changes merge** into the existing set, because Knock's `setPreferences` replaces the whole set by default.
- **Which switches appear** depends on what the person is or has:

  | Switch | Shown when |
  |---|---|
  | Refund Request updates | they have at least one Purchase |
  | Seat claims | they're a Team Admin on at least one Team Licence |
  | Enrollments, Discussion Questions | they're an Instructor |
  | Open Refund Requests | they're a Platform Admin |
  | Discussion Replies | always |

  A hidden switch keeps its default.
- **UI:** a Notifications card on `/settings`, below Profile, with one switch per row and no channel column. Each switch saves optimistically through a Cadence action that parses its input with zod. A failed save shows a toast.

### User sync
- Sync runs at signup, after a name change in `/settings`, after Platform Admin edits in the users admin page, and in the seed. A one-off backfill script covers existing users.
- Sync sends name, email and avatar (`users.avatarUrl` as Knock's standard `avatar`) and writes the default preferences if the user has none.
- Role isn't synced. A failed sync is caught and logged.

### Client feed port
- A Cadence-shaped client interface: list Notifications (cursor-paged), unseen count, mark one read, mark all read, mark all seen, subscribe to live updates.
- A Knock adapter backs it, built on `@knocklabs/client`. Feed components only call this interface.
- **Auth:** the server signs an RS256 user token (`sub` = Cadence user id) for the current session user, the one the DevUI panel selected, and hands it to the client with the public key. A token for one user gets 403 on another user's feed.
- **Live updates:** one real-time socket per signed-in user (`listenForUpdates`). It drives both the badge and the open popover, and nothing polls; polling hit Knock's rate limit (429) in the prototype. The socket is torn down and re-authenticated when the DevUI user changes.
- **Bulk updates:** mark-seen on popover open and "Mark all as read" use the bulk-by-channel status update, so Notifications that haven't loaded are covered. Never call the batch endpoints with an empty id list (Knock returns 422).
- **Pagination:** infinite scroll over Knock's `after` cursor.
- **No Knock keys locally:** the feed shows its empty state.

### Feed UI
- **Placement:** a bell popover in the sidebar header, variant A2 from the prototype branch [`prototype/notification-feed`](https://gist.github.com/mattpocock/87be0d1df4945234bba66f775ade6768#file-notification-feed-patch) (`InfiniteScrollPopover`). There's no nav item, drawer or separate page.
- **Header:** "Notifications" on the left; "Mark all as read" and the preferences gear on the right.
- **Rows:**
  - The sender's avatar with a category icon inset; the Cadence "C" avatar when there's no sender.
  - Title, snippet and relative time.
  - Unread rows have a bold title; read rows have a faded avatar.
  - A ✓ marks a row read and then disappears. There's no mark-unread.
- **Click targets:**

  | Notification | Goes to |
  |---|---|
  | Discussion Question or Reply | the lesson with `#comment-<id>` |
  | Open Refund Request | the refunds admin page |
  | Refund decision | the buyer's Purchase or refund page |
  | Seat claim | the team page |
  | Enrollment | the Instructor's students page for the course |
  | Refund Request confirmation | nowhere: it only marks read and the popover stays open |

## Testing Decisions

- **A good test checks external behaviour through the service's public functions.** It sets up a domain state in an in-memory database, calls the action, and asserts:
  - the domain result, and
  - what the fake Notifications adapter recorded: which Notification, which recipients, which data, which idempotency key, which archives.

  Tests don't check how the adapter builds Knock calls.
- **One seam:** the server Notifications port, with the in-memory fake injected. No vitest test hits Knock.
- **Modules tested:**
  - **Refunds service:** Notifications for raising, approving and declining; every Platform Admin gets #3 and non-admins don't. A port failure doesn't fail the domain action. Team Licence buyers are treated the same way.
  - **Enrollment service:**
    - #5 goes to the course's Instructor for an Individual Purchase and for a Claimed Seat, and when a Lapsed Student re-enrolls.
    - Buying a Team Licence doesn't fire it.
  - **Seat claim service:** #4 goes to the Team Admin with the correct number of Seats left, and the Seat claim fires #5 as well.
  - **Comments service:**
    - #6 goes to the Instructor except when they ask the question themselves; a Platform Admin's question still fires it.
    - #7 goes only to the question's author and not for their own replies.
    - Deleting a question archives #6 but leaves #7 Notifications in place; deleting a reply archives its #7.
    - Both former call sites behave the same.
  - **User sync and preferences:**
    - Default preferences are written only when the user has none.
    - A change merges into the existing set.
    - Which switches appear follows what the person is or has, not their role.
- **Prior art:**
  - `refunds.server.test.ts`: an in-memory database from `createTestDb` and `seedBaseData`, plus a fixed `NOW`.
  - `mailer.server.test.ts`: the transport-port pattern.
- **Checked manually, not in vitest:**
  - The Knock adapters, which are thin mappings already proven by the spike.
  - The client feed port and bell UI: signed tokens across DevUI switches, live updates, bulk seen and read, infinite scroll, deleted-comment archiving and click targets. These are checked against the Knock Development environment.
- Before reporting done, run `npm run typecheck` then `npm run test`.

## Out of Scope

- Email as a Notification channel. It's a follow-up effort, expected soon. The existing direct Postmark refund emails carry on until it lands, and then both get replaced together.
- Web push, along with a Firebase/FCM sign-up, a service worker and a permission UX.
- Native mobile apps and native push; SMS; chat channels such as Slack.
- Self-hosting a vendor or building our own delivery infrastructure.
- Refund payout Notifications (Pending, Issued and Failed Refunds). These wait on Cadence tracking payouts.
- Ratings, new lessons, comment edits or deletions as Notifications, following threads, and other Platform Admin Notifications (Purchases, Instructors, course status).
- Digests, nudges, marketing messages and receipts.
- A global mute-all, mark-unread, numbered pages, and a separate Notifications page.
- Retries or a job queue for failed triggers. Idempotency keys leave room for these later.
- Syncing role to Knock.

## Further Notes

- Map: [reference #12](map.md). Decisions come from [reference #13](decisions.md#reference-issue-13)–[reference #22](decisions.md#reference-issue-22), especially:
  - [reference #15](decisions.md#reference-issue-15): catalogue
  - [reference #18](decisions.md#reference-issue-18): channels
  - [reference #19](decisions.md#reference-issue-19): feed
  - [reference #20](decisions.md#reference-issue-20): preferences
  - [reference #21](decisions.md#reference-issue-21): Knock spike
  - [reference #22](decisions.md#reference-issue-22): plumbing
- Prototype branches: [`prototype/knock-spike`](https://gist.github.com/mattpocock/87be0d1df4945234bba66f775ade6768#file-knock-spike-patch) (signed tokens, triggering, preferences, a dashboard wizard for workflows) and [`prototype/notification-feed`](https://gist.github.com/mattpocock/87be0d1df4945234bba66f775ade6768#file-notification-feed-patch) (feed UI variant A2).
- Every new workflow in the catalogue must be created and committed in each Knock environment before triggering. Extending the wizard to create all 8 is the likely route.
- Knock's free tier is 10K messages a month. The paid tier jumps to $250/mo, and that cliff has been accepted.
- A user Cadence never synced would default to Enrollments **on**. The backfill and the seed close that gap.
- Use the glossary terms throughout code and copy: Notification, Notification Feed, Discussion Question, Discussion Reply, Open Refund Request, Claimed Seat, Team Admin, Platform Admin.


## Source resolution

All tickets ([reference #24](implementation-tickets.md#reference-issue-24)–[reference #31](implementation-tickets.md#reference-issue-31)) implemented and code-reviewed on the integration branch. Typecheck + 497 tests pass. The code is the `ship-in-app-notifications` lesson commit: `npm run reset ship-in-app-notifications`. Manual steps remaining: run `bash scripts/knock-wizard.sh` to create/commit all workflows in Knock, run `npm run knock:sync-users` backfill, and browser-check the feed UI.
