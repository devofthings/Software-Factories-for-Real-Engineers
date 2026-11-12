# Completed reference implementation tickets

> Imported from Matt Pocock's [07-spec-implement snapshot](https://gist.github.com/mattpocock/87be0d1df4945234bba66f775ade6768#file-07-spec-implement-json), captured 2026-10-08T13:53:46Z. This is historical reference material. Source issue numbers, credential setup, manual checks, test counts, and pricing describe Matt's environment. See [our adoption notes](README.md) for current project status.



<a id="reference-issue-24"></a>

## Reference #24: Prefactor: Comments, Enrollment and Seat claim services

Source status: closed.

## Parent

[reference #23](spec.md)

## What to build

Move the domain actions that will fire Notifications out of the routes and into tested `*.server.ts` services. This is a pure refactor: nothing changes for Students, Instructors or Team Admins. It makes the Notification tickets that follow small.

- **Comments service:** the two duplicate `createComment` functions (the lesson page and the instructor questions page) become one function. Comment soft-delete moves into the same service.
- **Enrollment service:** creating an Enrollment (today's `enrollUser` in the purchase route) moves into a service.
- **Seat claim service:** claiming a Seat (today's `redeemCoupon` in the redeem route) moves into a service, and the Enrollment it grants goes through the Enrollment service.

Each service follows the existing refunds service:
- It takes `db` first and `now` as a parameter.
- It returns results rather than throwing for expected failures.
- Routes keep their zod parsing and thrown responses.

## Acceptance criteria

- [ ] There is one `createComment`, and both the lesson page and the instructor questions page use it, with their behaviour unchanged
- [ ] Comment soft-delete lives in the Comments service
- [ ] Enrollment creation (Individual Purchase, including a Lapsed Student re-enrolling) lives in the Enrollment service
- [ ] Claiming a Seat lives in the Seat claim service and enrols through the Enrollment service; Seats on hold or refunded still can't be claimed
- [ ] Each service has vitest coverage in the style of the refunds service tests (in-memory database from the test setup, fixed `now`)
- [ ] `npm run typecheck` and `npm run test` pass


### Source resolution 1

Implemented as part of [reference #23](spec.md). Typecheck and tests pass. The code is the `ship-in-app-notifications` lesson commit: `npm run reset ship-in-app-notifications`.

<a id="reference-issue-25"></a>

## Reference #25: Tracer bullet: Discussion Reply Notification to the question author, end to end

Source status: closed.

## Parent

[reference #23](spec.md)

## What to build

The first Notification, working end to end against Knock. When someone replies to a Discussion Question they didn't write, the question's author sees a Notification in a new **Notification Feed**: a bell in the sidebar header that opens a popover. The Notification arrives live, without a reload.

It cuts through every layer:

- **Server Notifications port.** A Cadence-owned interface, in Cadence's language, modelled on the mail transport port. It covers triggering, preferences, user sync and archiving; this ticket only needs triggering, but the shape should leave room for the rest. It has three adapters:
  - **Knock:** the only code that imports the Knock SDK or knows Knock's workflow, category and channel keys.
  - **In-memory fake:** records what was sent, for tests.
  - **No-op:** logs, and is used when `KNOCK_SECRET_API_KEY` is missing.

  Services take the port as an injected parameter, like `db` and `now`.
- **Trigger.**
  - The Comments service fires the Discussion Reply Notification (#7) to the question's author only, and not when the author replies to their own question.
  - It fires inline after the comment is written, with the idempotency key `discussion-reply:<commentId>`.
  - It passes the recipient and the actor inline (id, name, email, avatar), and puts the comment id, lesson and snippet in the trigger data.
  - A port failure is caught and logged and never fails creating the comment.
- **Knock workflow.** A `discussion-reply` in-app workflow in the Discussion Replies category, committed in Development. Extend the Knock dashboard wizard to create it. Workflows must leave room for a later email step.
- **Signed user token.** The server signs an RS256 token (`sub` = the Cadence user id) for the current session user, the one the DevUI panel selected, and hands it to the client with the public key.
- **Client feed port.** A Cadence-shaped client interface: list, unseen count, mark read, subscribe. Its Knock adapter is built on `@knocklabs/client`, with one real-time socket per signed-in user and no polling. Switching user in the DevUI panel tears down the socket and re-authenticates with the new user's token.
- **Bell popover.** It follows variant A2 from the [`prototype/notification-feed`](https://gist.github.com/mattpocock/87be0d1df4945234bba66f775ade6768#file-notification-feed-patch) branch:
  - A red badge counting unseen Notifications.
  - A "Notifications" header.
  - Newest-first rows: the sender's real avatar with a Discussion category icon inset, then a title and a one-line snippet written by Cadence from the trigger data, then the relative time.
  - Unread rows have a bold title; read rows have a faded avatar.
  - Clicking a row marks it read and goes to that comment on the lesson (`#comment-…`).
- **Environment.** Vite doesn't put non-`VITE_` `.env` values on `process.env`, so the Knock keys need loading some other way. The Knock spike used `process.loadEnvFile`.

## Acceptance criteria

- [ ] Replying to someone else's Discussion Question puts a Notification in the question author's Notification Feed within seconds, without a reload
- [ ] Replying to your own Discussion Question sends nothing, and nobody else in the thread is notified
- [ ] Switching user in the DevUI panel switches the feed and its live connection to that user; one user's token can't read another user's feed
- [ ] The badge counts unseen Notifications
- [ ] Clicking a row marks it read and lands on the comment itself
- [ ] A failure in the port is logged and the reply is still saved
- [ ] Without `KNOCK_SECRET_API_KEY` the app runs, Notifications are logged, and the feed is empty
- [ ] Only the adapters reference Knock
- [ ] vitest covers the Comments service's Discussion Reply rule against the fake adapter (recipient, data, idempotency key, own-reply exclusion, and failure tolerance); no test hits Knock
- [ ] The wizard creates and commits the `discussion-reply` workflow
- [ ] `npm run typecheck` and `npm run test` pass


### Source resolution 1

Implemented as part of [reference #23](spec.md). Typecheck and tests pass. The code is the `ship-in-app-notifications` lesson commit: `npm run reset ship-in-app-notifications`.

<a id="reference-issue-26"></a>

## Reference #26: Notification Feed: full behaviour

Source status: closed.

## Parent

[reference #23](spec.md)

## What to build

Finish the Notification Feed so it behaves as decided in [reference #19](decisions.md#reference-issue-19).

- **Infinite scroll** inside the popover over Knock's `after` cursor. There are no numbered pages.
- **History kept forever:** read Notifications stay in the list, and scrolling reaches all of them.
- **Seen when the popover opens:** opening it marks every Notification seen, including ones not loaded yet, using the client's bulk-by-channel status update. The badge clears. Seen isn't read: rows stay unread.
- **Mark all as read:** a link on the right of the header marks every Notification read, including ones not loaded, using the bulk-by-channel update.
- **✓ on each unread row:** marks just that row read and then disappears. There's no mark-unread.
- **Badge cap:** the badge reads "9+" above nine.
- **Empty state:** "You're all caught up."
- **Cadence "C" avatar:** shown for Notifications with no sender.
- **Rows with nowhere to go:** clicking one only marks it read, and the popover stays open.

Never call Knock's batch endpoints with an empty id list, because Knock returns 422.

All of this lives behind the client feed port. Feed components never touch Knock directly.

## Acceptance criteria

- [ ] Scrolling to the bottom of the popover loads older Notifications until the whole history has loaded
- [ ] Opening the popover clears the badge even when there are more unseen Notifications than are loaded, and unread rows stay bold
- [ ] "Mark all as read" marks every Notification read, loaded or not
- [ ] The ✓ marks one row read and disappears
- [ ] The badge shows "9+" above nine
- [ ] An empty feed shows "You're all caught up."
- [ ] A Notification with no sender shows the Cadence "C" avatar
- [ ] A Notification with no click target only marks itself read and the popover stays open
- [ ] There are no 422s from empty batch calls and no polling against Knock
- [ ] `npm run typecheck` and `npm run test` pass


### Source resolution 1

Implemented as part of [reference #23](spec.md). Typecheck and tests pass. The code is the `ship-in-app-notifications` lesson commit: `npm run reset ship-in-app-notifications`.

<a id="reference-issue-27"></a>

## Reference #27: Discussion Questions to the Instructor, and deleted comments disappear

Source status: closed.

## Parent

[reference #23](spec.md)

## What to build

Instructors hear about new Discussion Questions on their lessons. A Discussion Question or Reply Notification disappears from the feed when the comment behind it is deleted.

- **Discussion Question (#6):**
  - When anyone other than the course's Instructor (Platform Admins included) posts a Discussion Question, the Instructor gets a Notification: who asked, which lesson, a snippet. Clicking it goes to the comment.
  - Idempotency key: `discussion-question:<commentId>`.
  - It uses a new `discussion-question` in-app workflow in the Discussion Questions category, added to the wizard and committed.
- **Deleted comments:**
  - When a comment is soft-deleted, the Comments service asks the port to archive the Notifications that comment caused: the Instructor's #6 for a Discussion Question, or the question author's #7 for a Discussion Reply.
  - The Knock adapter finds them with the List Messages `trigger_data` filter on the comment id and archives them. Knock's feed leaves out archived messages.
  - If that filter doesn't work with the secret key, fall back to a small table mapping comment id to Knock message id, following the database-migrations skill.
  - Deleting a Discussion Question leaves the Discussion Reply Notifications under it in place.
- **Edits:** editing a comment changes no Notification. A Notification is a snapshot of when it was sent.

## Acceptance criteria

- [ ] A Student's or Platform Admin's Discussion Question notifies the course's Instructor
- [ ] The Instructor's own top-level comment notifies nobody
- [ ] Clicking a Discussion Question Notification lands on the comment
- [ ] Deleting a Discussion Question removes its Notification from the Instructor's feed
- [ ] Deleting a Discussion Reply removes its Notification from the question author's feed
- [ ] Deleting a Discussion Question leaves its replies' Notifications in place
- [ ] Editing a comment leaves its Notification unchanged
- [ ] A port failure on trigger or archive is logged and never fails the comment action
- [ ] vitest covers all of the above against the fake adapter
- [ ] `npm run typecheck` and `npm run test` pass


### Source resolution 1

Implemented as part of [reference #23](spec.md). Typecheck and tests pass. The code is the `ship-in-app-notifications` lesson commit: `npm run reset ship-in-app-notifications`.

<a id="reference-issue-28"></a>

## Reference #28: Refund Request Notifications

Source status: closed.

## Parent

[reference #23](spec.md)

## What to build

The refunds service fires Notifications as Refund Requests are raised and decided. The buyer is a Student for an Individual Purchase, or the Team Admin for a Team Licence.

- **Refund Request confirmation (#8) → buyer**, when they raise a Refund Request. It names the course and the amount and says the request is under review. It comes from Cadence itself, so it has no sender, shows the "C" avatar, and has nowhere to click.
- **Refund Request approved (#1) → buyer.** It names the course and Purchase, includes the decision note if there is one, and links to the buyer's refund or Purchase page.
- **Refund Request declined (#2) → buyer.** It names the course and Purchase, includes the decision note, and says they can ask again.
- **Open Refund Request (#3) → every Platform Admin.** Recipients are every `role = admin` user, queried at trigger time. It shows who asked, which course, the amount and the reason, and links to the refunds admin page. When one Platform Admin decides the request, the other admins' Notifications stay as they are.

Details:
- **Triggers:** each fires after the domain write commits. Failures are caught and logged, and never fail the refund action.
- **Idempotency keys:** `refund-requested:<id>`, `refund-approved:<id>`, `refund-declined:<id>` and `refund-request-open:<id>`.
- **Categories:** #8, #1 and #2 share the Refund Request updates category; #3 is in Open Refund Requests. Add the workflows to the wizard and commit them.
- **Emails:** the existing direct Postmark refund emails carry on unchanged alongside these Notifications.

## Acceptance criteria

- [ ] Raising a Refund Request puts a confirmation in the buyer's feed, and an Open Refund Request Notification in every Platform Admin's feed and nobody else's
- [ ] Approving or declining puts the decision, with any note, in the buyer's feed
- [ ] This works for both an Individual Purchase and a Team Licence buyer
- [ ] Clicking the Open Refund Request Notification goes to the refunds admin page, and clicking a decision goes to the buyer's refund or Purchase page
- [ ] The Postmark refund emails are still sent
- [ ] A port failure is logged and the refund action still succeeds
- [ ] vitest in the refunds service tests covers recipients, data and idempotency keys for all four Notifications against the fake adapter
- [ ] `npm run typecheck` and `npm run test` pass


### Source resolution 1

Implemented as part of [reference #23](spec.md). Typecheck and tests pass. The code is the `ship-in-app-notifications` lesson commit: `npm run reset ship-in-app-notifications`.

<a id="reference-issue-29"></a>

## Reference #29: Seat claim Notification to the Team Admin

Source status: closed.

## Parent

[reference #23](spec.md)

## What to build

A Team Admin hears when a Student claims a Seat on their Team Licence.

- When a Seat is claimed, the Seat claim service fires the Seat claim Notification (#4) to the Team Admin who bought the Team Licence. It shows who claimed it, which course, and how many Seats are left.
- There's one Notification per claim. There's no separate "all Seats claimed" Notification.
- Clicking it goes to the team page.
- **Idempotency key:** `seat-claimed:<seatId>`.
- **Workflow:** a `seat-claimed` in-app workflow in the Seat claims category, added to the wizard and committed.
- **Failures:** caught and logged; the claim still succeeds.

## Acceptance criteria

- [ ] Claiming a Seat puts a Notification in the Team Admin's feed showing the claimer, the course and the correct number of Seats left
- [ ] Clicking it lands on the team page
- [ ] A Seat that can't be claimed (on hold or refunded) sends nothing
- [ ] A port failure is logged and the claim still succeeds
- [ ] vitest covers the Seat claim service against the fake adapter
- [ ] `npm run typecheck` and `npm run test` pass


### Source resolution 1

Implemented as part of [reference #23](spec.md). Typecheck and tests pass. The code is the `ship-in-app-notifications` lesson commit: `npm run reset ship-in-app-notifications`.

<a id="reference-issue-30"></a>

## Reference #30: User sync and the Notifications card on /settings

Source status: closed.

## Parent

[reference #23](spec.md)

## What to build

Cadence keeps its users in sync with Knock, and people choose which Notification categories reach their feed.

- **User sync** through the server port:
  - It sends name, email and avatar (`users.avatarUrl` as Knock's standard `avatar`).
  - It writes the default preference set **only if the user has none yet**: Enrollments off, everything else on. Knock's environment default is dashboard-only, so Cadence writes each user's own `default` set.
  - It runs at signup, after a name change on `/settings`, after Platform Admin edits on the users admin page, and in the seed. A one-off backfill script covers existing users.
  - Role isn't synced. A failed sync is caught and logged.
- **Preferences** are stored as category × channel, with only the feed channel used in v1. The adapter maps Cadence's names to Knock's category keys and `in_app_feed`.

  Changing one switch **merges** into the existing set, because Knock's `setPreferences` replaces the whole set by default.
- **A Notifications card on `/settings`**, below Profile, with one switch per category and no channel column. Which switches appear depends on what the person is or has, not their role:

  | Switch | Shown when |
  |---|---|
  | Refund Request updates | they have at least one Purchase |
  | Seat claims | they're a Team Admin on at least one Team Licence |
  | Enrollments | they're an Instructor |
  | Discussion Questions | they're an Instructor |
  | Open Refund Requests | they're a Platform Admin |
  | Discussion Replies | always |

  - A hidden switch keeps its default.
  - Each switch saves when flipped, optimistically, through a Cadence action that parses its input with zod. A failed save shows a toast.
  - There's no mute-all.
- **A gear icon** in the Notification Feed popover header links to the card.

## Acceptance criteria

- [ ] Signing up, changing your name, a Platform Admin editing a user, and seeding all sync the user to Knock
- [ ] Sync writes the defaults only for users with no preference set; an existing set is left alone
- [ ] The backfill script syncs every existing user
- [ ] Changing your avatar shows in Notifications you sent earlier
- [ ] The Notifications card shows exactly the switches that fit what the person is or has
- [ ] Flipping a switch saves at once and leaves every other preference unchanged; a failed save shows a toast
- [ ] Muting a category stops new Notifications of that category reaching the feed (for example, mute Discussion Replies and reply to that person's question)
- [ ] The popover's gear links to the card
- [ ] A failed sync is logged and never fails signup or settings
- [ ] vitest covers defaults-only-if-none, merge-on-change and switch visibility against the fake adapter
- [ ] `npm run typecheck` and `npm run test` pass


### Source resolution 1

Implemented as part of [reference #23](spec.md). Typecheck and tests pass. The code is the `ship-in-app-notifications` lesson commit: `npm run reset ship-in-app-notifications`.

<a id="reference-issue-31"></a>

## Reference #31: Enrollment Notification to the Instructor (opt-in)

Source status: closed.

## Parent

[reference #23](spec.md)

## What to build

An Instructor can opt in to hear about every new Enrollment on their courses. It's off until they turn it on.

- The Enrollment service fires the new Enrollment Notification (#5) to the course's Instructor. It shows which Student and which course, and clicking it goes to the Instructor's students page for that course.
- It fires for an Enrollment from an Individual Purchase or a Claimed Seat, including a Lapsed Student enrolling again. Buying a Team Licence doesn't fire it, because that gives no Enrollment.
- **Idempotency key:** `enrollment:<enrollmentId>`.
- **Workflow:** a `new-enrollment` in-app workflow in the Enrollments category, added to the wizard and **committed**. Uncommitted workflows have no category at runtime, so the preference has nothing to match.
- **Off by default:** this relies on user sync having written Enrollments off into each user's own preference set. The Instructor opts in with the Enrollments switch on the Notifications card.
- **Failures:** caught and logged; the Enrollment still succeeds.

## Acceptance criteria

- [ ] With default preferences, a new Enrollment puts nothing in the Instructor's feed
- [ ] After the Instructor turns Enrollments on, a new Enrollment from an Individual Purchase notifies them, as does one from a Claimed Seat
- [ ] A Lapsed Student re-enrolling notifies the Instructor
- [ ] Buying a Team Licence notifies nobody about Enrollment
- [ ] Clicking the Notification lands on the course's students page
- [ ] A port failure is logged and the Enrollment still succeeds
- [ ] vitest covers the Enrollment service's triggers against the fake adapter
- [ ] `npm run typecheck` and `npm run test` pass


### Source resolution 1

Implemented as part of [reference #23](spec.md). Typecheck and tests pass. The code is the `ship-in-app-notifications` lesson commit: `npm run reset ship-in-app-notifications`.
