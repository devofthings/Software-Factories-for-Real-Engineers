# Completed reference decisions

> Imported from Matt Pocock's [07-spec-implement snapshot](https://gist.github.com/mattpocock/87be0d1df4945234bba66f775ade6768#file-07-spec-implement-json), captured 2026-10-08T13:53:46Z. This is historical reference material. Source issue numbers, credential setup, manual checks, test counts, and pricing describe Matt's environment. See [our adoption notes](README.md) for current project status.



<a id="reference-issue-13"></a>

## Reference #13: Which hosted notification vendor fits Cadence?

Source status: closed.

## Question

Which hosted notification vendor should Cadence use? Compare Knock, Novu Cloud, MagicBell, Courier and SuprSend (and any strong option we've missed) on:

- **Free tier usable in development** (must-have)
- A headless in-app feed API: list a user's Notifications, unread count, mark read/seen. We build the UI ourselves, so prebuilt React components don't matter.
- Triggering from a Node server (SDK or REST)
- Production-grade per-user auth for the feed (signed user tokens or similar)
- Web push and email as channels on the same workflow
- Per-user preferences stored by the vendor (per category × per channel)
- Pricing beyond the free tier

Finish with one recommended vendor and the reasons.

### Source resolution 1

## Resolution: use **Knock**

Knock is the only candidate that meets every criterion on its free plan:

- **Free tier:** 10K messages a month on the Developer plan.
- **Feed auth:** in production it *requires* signed user tokens. These are RS256 JWTs that our server signs for whichever user is in the session, so they work with the DevUI switcher.
- **Preferences:** vendor-stored, by category × channel type.
- **Feed API:** a mature headless feed API with list, `unread_count`/`unseen_count` and mark seen/read/archived.
- **Triggering:** Node SDK.

The costs:

- **Web push goes through Firebase Cloud Messaging.** Knock has no first-party web push channel, so we need the Firebase SDK, a service worker and a Firebase project.
- **Steep jump to paid.** Starter is $250/mo for 50K messages, then $0.005 per message.

**How the others compare**

- **Novu Cloud:** has the cheapest paid tier (from $30/mo). Its feed auth is a static HMAC of the subscriber id with no expiry, and its preferences cover workflow × channel only, with no categories.
- **MagicBell:** has native VAPID web push, user JWTs and category × channel preferences. The free tier is only 1K deliveries a month, and the next tier is $249/mo.
- **Courier:** has scoped JWTs with expiry, topic × channel preferences and pay-as-you-go pricing at $0.005/send. Web push needs OneSignal or FCM. It is the runner-up.
- **SuprSend:** has native web push and ES256 JWTs, but vendor-stored preferences are not on Free and category preferences need Business at $250/mo. It fails the brief.

Full findings with sources: https://github.com/ai-hero-dev/cohort-005-project/blob/research/notification-vendors/docs/research/notification-vendors.md


<a id="reference-issue-14"></a>

## Reference #14: How far can web push reach without a native app?

Source status: closed.

## Question

Cadence has no mobile app. How far can browser web push actually reach? Cover browser and OS support (desktop and mobile), iOS/iPadOS's home-screen web app requirement, how the permission prompt works and what browsers require before showing it, service worker requirements, and how hosted notification vendors support web push. Is web push a credible channel for Cadence, or should email be the default out-of-app channel?

### Source resolution 1

## Resolution

**Conclusion:** Email should be Cadence's default out-of-app channel. Web push is credible only as an extra channel people opt into, and everything it sends should also land in the Notification Feed.

**Key facts**
- **Desktop and Android:** supported in Chrome 42+, Edge 17+, Firefox 44+ (Android 48+), Safari 16+ on macOS Ventura+, and Samsung Internet. Android WebView has no support, so in-app browsers built on it can't subscribe.
- **iOS/iPadOS 16.4+:** web push works only after the person adds Cadence to their Home Screen as a web app (manifest with `display: standalone`/`fullscreen`). Plain Safari tabs can't receive it. For a web-only product that is a big drop-off.
- **EU:** Apple kept Home Screen web apps in iOS 17.4 after removing them in the betas. This was confirmed only through a search snapshot, so recheck it if we rely on it.
- **Permission prompts:** Firefox 72+ and Safari need a user gesture before they show the prompt. Once someone blocks the prompt, the site can't ask again. Best practice is our own soft pre-prompt first, at a moment when the benefit is obvious.
- **Chrome penalties:** a quieter permission prompt for sites with low acceptance; since Oct 2025, permission is removed automatically from sites whose notifications get little engagement (installed web apps are exempt); since Jan 2026, disruptive sites are rate-limited.
- **Technical:** HTTPS, a service worker, `PushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` with VAPID keys (RFC 8292), and every push must show a visible notification. Delivery is best-effort (RFC 8030): messages can be dropped and subscriptions can expire at any time.
- **Vendors:** MagicBell (native support; it manages VAPID keys; the free plan has 1,000 deliveries a month) and SuprSend (native WebPush; the free plan has 10k notifications a month) support web push themselves. Knock, Novu and Courier only offer it through other providers such as FCM. A vendor saves the build work but doesn't get around the iOS or permission limits.

**Findings (with sources):** https://github.com/ai-hero-dev/cohort-005-project/blob/research/web-push-reach/docs/research/web-push-reach.md


<a id="reference-issue-15"></a>

## Reference #15: Which Notifications does Cadence send, and to whom?

Source status: closed.

## Question

What is the notification catalogue? For each of Student, Instructor, Platform Admin and Team Admin: which events produce a Notification, who exactly receives it, and what it says at a high level. Start from events that already exist in the code (Refund Requests and their outcomes, Refunds, Enrollments, Claimed Seats, comments, questions, ratings, new lessons) and decide which make the cut for v1.

### Source resolution 1

## Resolution: the v1 Notification catalogue

**Rule:** a Notification is sent for an event that concerns the recipient and was caused by someone else, or by the system. Nobody gets a Notification about their own action. There are no digests, nudges, marketing messages or receipts.

| # | Event | Recipient | Says (high level) | Default |
|---|---|---|---|---|
| 1 | A Refund Request is approved | The buyer (a Student, or the Team Admin for a Team Licence) | The course and Purchase, that it was approved, and the decision note if one was given | On |
| 2 | A Refund Request is declined | The buyer | The course and Purchase, that it was declined, the decision note, and that they can ask again | On |
| 3 | A new Open Refund Request | Every Platform Admin | Who asked, which course, the amount, the reason, and a link to `admin.refunds`. When one admin decides it, the other admins' Notifications stay as they are | On |
| 4 | A Seat is claimed | The Team Admin who owns the Team Licence | Who claimed it, which course, and how many Seats are left (one per claim, no "all Seats claimed" Notification) | On |
| 5 | A new Enrollment, from an Individual Purchase or a Claimed Seat, including a Lapsed Student enrolling again. Buying a Team Licence doesn't count | The course's Instructor | Which Student, which course | **Off**. Each Instructor opts in through the general preferences mechanism, not a setting just for Instructors |
| 6 | A new Discussion Question (from anyone except the course's Instructor, Platform Admins included) | The course's Instructor | Who asked, which lesson, a snippet, and a link | On |
| 7 | A Discussion Reply from someone other than the question's author | The author of the Discussion Question only (not everyone in the thread) | Who replied, which lesson, a snippet, and a link | On |

**Not in v1:**
- Confirming a Refund Request to the person who made it (it's their own action).
- Ratings.
- New lessons: there's no lesson publish event, so it would notify Students about lessons that are still drafts.
- Edits and deletions of Discussion comments.
- Notifying everyone in a discussion thread ("follow").
- Other Platform Admin Notifications (Purchases, Instructors, course status).

**Deferred:** Notifications for Pending, Issued and Failed Refunds. These states are in the glossary but not in the code, which doesn't track payouts.

**Glossary:** added **Discussion Question** and **Discussion Reply** so they don't clash with quiz questions.

**Handed to later tickets:** whether a deleted comment's Notification disappears from the Notification Feed goes to the Notification Feed ticket. Enrollment Notifications being off by default and opt-in is a hard requirement for user preferences.


### Source resolution 2

**Amended** by [Which channels does each Notification go out on?](decisions.md#reference-issue-18): the own-action rule now has an exception for confirming a request that waits on someone else's decision, and **Refund Request confirmation → buyer** is Notification 8 (on by default). The "Not in v1" line about confirming a Refund Request no longer applies.

<a id="reference-issue-16"></a>

## Reference #16: Pick the notification vendor

Source status: closed.

## Question

Given the research, which single hosted vendor do we commit to? We'll sign up for this one only and prototype against it.

### Source resolution 1

## Resolution: **Knock**, provisionally. A prototype decides whether we keep it

- **Vendor:** Knock. Its feed API and category × channel preferences beat Courier's, and those two shape most of the remaining tickets. Web push is now a minor opt-in channel, so MagicBell's native web push no longer tips the balance. Its 1K/mo free tier is also too tight.
- **Provisional:** we commit to Knock only after [Does Knock hold up against Cadence?](decisions.md#reference-issue-21) passes its four checks: signed user tokens that work with the DevUI switcher, Node SDK triggering into the feed, the headless feed API (list / unread count / mark read-seen), and an opt-in-only preference. If it fails, we reopen this choice.
- **Fallback:** Courier (the runner-up). We don't sign up unless Knock fails.
- **Extra sign-ups put off:** Firebase (Knock's web push goes through FCM) and an email provider (Resend/Postmark etc.) are signed up for only if [Which channels does each Notification go out on?](decisions.md#reference-issue-18) puts web push or email in v1. [Sign up for the notification vendor and provision dev keys](decisions.md#reference-issue-17) is Knock-only.
- **Pricing:** the $250/mo paid cliff is accepted. 10K messages a month (each channel send counts) comfortably covers the 7-Notification v1 catalogue.


<a id="reference-issue-17"></a>

## Reference #17: Sign up for the notification vendor and provision dev keys

Source status: closed.

## Question

Sign up for the chosen vendor on its free tier, create a development environment, and provision the API keys/secrets needed to trigger Notifications and authenticate the Notification Feed. Record where the credentials live (e.g. `.env` variable names) and any dashboard URLs later tickets need.

### Source resolution 1

## Resolution: Knock Development environment is set up, and the keys are in `.env`

**What was done**
- Signed up for Knock on the free Developer plan. Everything below is in the **Development** environment.
- Created an in-app feed channel ("Cadence feed").
- Generated an application signing key (RSA 4096) for signed user tokens.
- Turned on enhanced security mode for Development.

**Where the credentials live:** the repo's gitignored `.env`. It's local only, and no CI secrets are needed.

| Variable | What it is |
|---|---|
| `KNOCK_PUBLIC_API_KEY` | Public key, `pk_test_…`. Used for client-side feed calls. |
| `KNOCK_SECRET_API_KEY` | Secret key, `sk_test_…`. Server-only; used to trigger workflows and manage users. |
| `KNOCK_SIGNING_KEY` | Private signing key, single-line base-64 PEM. The Knock SDK looks for this name by default. |
| `KNOCK_FEED_CHANNEL_ID` | UUID of the in-app feed channel. |

**Dashboard:** https://dashboard.knock.app. Keys are under Platform → API keys. Channels are under Settings → Channels and sources.

**Verified:**
- The secret key can call `GET /v1/users` (200; a bogus key gets 401).
- A server-signed RS256 token (`sub` + `exp`) reads the feed with the public key (200).
- With no token, the feed call is rejected with `missing_user_token`. With a bad token, it's rejected with `invalid_user_token`. So enhanced security is enforced in Development.

**Gotchas for later tickets**
- The base-64 signing key is about 4.4K characters. Pasting it into a terminal prompt cuts it off at 4,095 characters. Paste it into an editor instead.
- Because enhanced security is on, every client feed call needs an `X-Knock-User-Token` header. That makes the DevUI-switcher check in the prototype a real test.

<a id="reference-issue-18"></a>

## Reference #18: Which channels does each Notification go out on?

Source status: closed.

## Question

For each Notification in the catalogue, which channels does it go out on: Notification Feed only, plus web push, plus email? Is web push in v1 at all, and is email in v1 at all?

### Source resolution 1

## Resolution: v1 is **Notification Feed only**

**Channels**
- Every Notification goes to the Notification Feed, with no exceptions.
- v1 has **no email and no web push**. Both are out of scope for this effort. Each would be its own follow-up effort, and email is expected to follow soon.
- **Constraint:** nothing in v1 may shut out a later email step. Preferences are modelled as category × channel, and only `in_app_feed` is used for now. Knock workflows must leave room for an email step.

**Refund emails move into Notifications**
- Cadence already emails the buyer directly through Postmark (`app/lib/refunds.server.ts`, `app/lib/mailer.server.ts`): "Refund requested" and "Refund approved/declined".
- Both events become Feed Notifications in v1.
- The direct emails **stay alongside them** until Notifications get an email channel. Then both are replaced by Notification email together. A buyer must never lose the email about their money in the meantime.

**Change to the catalogue** (it amends [Which Notifications does Cadence send, and to whom?](decisions.md#reference-issue-15))
- **The rule changes.** A person doesn't get a Notification about their own action, *unless* it confirms a request they made that now waits on someone else's decision. Today only Refund Requests fit, so this still keeps out Purchase receipts, your own comments, and the like.
- **New Notification 8: Refund Request confirmation.** It goes to the buyer (a Student, or the Team Admin for a Team Licence). It names the course and the amount and says the request is under review. It is **on** by default. Whether the buyer can turn it off is for [How do Notification preferences work in Cadence?](decisions.md#reference-issue-20).


<a id="reference-issue-19"></a>

## Reference #19: What does the Notification Feed look like in Cadence?

Source status: closed.

## Question

How should the Notification Feed look and behave inside Cadence? Where it sits in the layout, how unread counts show, what a Notification row looks like, how read/seen works, and what clicking one does. Prototype it roughly against the real vendor, using a few Notifications from the catalogue.

### Source resolution 1

## Resolution: a bell popover in the sidebar header with one chronological, infinitely scrolling list (variant A2)

| Aspect | Decision |
|---|---|
| **Placement** | A bell in the sidebar header, next to "Cadence". Clicking it opens a popover beside the sidebar. There's no Notifications nav item, drawer or separate page. |
| **Badge** | Counts **unseen** Notifications, shown in red and capped at "9+". Opening the popover marks them seen and the badge clears. Seen isn't read: rows stay unread until you act on them. |
| **Header** | "Notifications" on the left and a **Mark all as read** link on the right. No counts. |
| **List** | One chronological list, newest first. No Unread/Earlier sections. |
| **Row** | The sender's **real avatar** with a small category icon (Discussion, Refund, Team, Enrollment) inset at its bottom-right corner. Then a title, a one-line snippet or context, and how long ago it arrived. Unread rows have a bold title; read rows have a faded avatar. Notifications from Cadence itself, with no sender (the Refund Request confirmation), show a Cadence "C" avatar. |
| **Mark read** | Each unread row has a small ✓ that marks it read and then disappears. There's no "mark unread". |
| **Clicking a row** | Marks it read and goes to the **most specific place there is**: a Discussion Question or Reply goes to the comment itself (`#comment-…` on the lesson), not just the lesson. A Notification with nowhere to go (the Refund Request confirmation) only marks itself read, and the popover stays open. |
| **Pagination** | **Infinite scroll** inside the popover, over Knock's cursor (`after`). There are no numbered pages; Knock can't do them. |
| **History** | **Kept forever**: read Notifications stay in the list and scrolling reaches all of them. We chose this over unread-only, "the tick means done" and a 7-day recent window. |
| **Empty** | "You're all caught up." |
| **Deleted comments** | When a Discussion Question or Reply is deleted, its Notification disappears from the feed. |

### Facts found while prototyping, for later tickets
- **Avatars come from Knock.** Cadence sends `users.avatarUrl` as Knock's standard `avatar` user property. Knock looks the sender up each time the feed loads, so older Notifications pick up avatar changes. This only works if Cadence keeps Knock users in sync.
- **Pagination is by cursor:** `page_size` (100 worked) plus `after`/`before`. Paging through all 108 Notifications in the seeded test feed worked.
- **Rate limit:** about 10 quick feed reads for one user returned **429 `rate_limited`**. The prototype checks for new Notifications every 4 seconds and adds a read for every page loaded. The real build should probably use Knock's live connection.
- **"Mark all" only covers what's loaded:** opening the popover marks only the loaded items seen, and the batch "Mark all as read" marks only loaded items read. The real build needs Knock's bulk endpoints so Notifications that haven't loaded yet are covered.
- **Deleted comments:** Knock's feed leaves out archived Notifications by default, so archiving the Notification when a comment is deleted is the likely approach. Not yet tested.
- **The text is Cadence's:** each row's text is written by Cadence from the Notification's `data`, not by Knock's templates.

### Assets
- Prototype branch: `prototype/notification-feed`, shipped as a patch, [`notification-feed.patch`](https://gist.github.com/mattpocock/87be0d1df4945234bba66f775ade6768#file-notification-feed-patch). Apply it on a branch with `git am notification-feed.patch`. A2 is `InfiniteScrollPopover` in `app/components/notification-feed-prototype.tsx`. The earlier commits hold the rejected variants: the drawer, the inbox page with live toasts, Load more, and Latest + See all.


<a id="reference-issue-20"></a>

## Reference #20: How do Notification preferences work in Cadence?

Source status: closed.

## Question

How can a person control which Notifications they get, and on which channel? Settle three things:

- What they can mute: each catalogue entry, groups of entries, or each entry on each channel.
- What the defaults are for each role.
- Where the setting lives in the app (`settings.tsx`?).

The decision must support the Enrollment Notification for Instructors: it's off by default and each Instructor can opt in (see [Which Notifications does Cadence send, and to whom?](decisions.md#reference-issue-15)). Use the vendor's own preference model where it covers this, rather than building our own.


### Source resolution 1

Context from [Does Knock hold up against Cadence?](decisions.md#reference-issue-21): Knock's preference model handles the Enrollment opt-in, but **Cadence has to set the default itself**. Write `enrollment` → `in_app_feed: false` into each Instructor's own `default` preference set. Knock's environment default can only be set in the dashboard (no API, a separate copy per environment), and a tenant default didn't suppress delivery when we tried it. Also, `setPreferences` replaces the whole set by default.

### Source resolution 2

## Resolution: six mutable categories on a Notifications card in `/settings`, behind a Cadence-owned interface

### What a person can mute
Six **preference categories**. Each one is a Knock category, and Notifications that mean the same thing to the recipient share one:

| Category | Notifications (catalogue #) | Default |
|---|---|---|
| Refund Request updates | confirmation (8), approved (1), declined (2) | On |
| Open Refund Requests | 3 | On |
| Seat claims | 4 | On |
| Enrollments | 5 | **Off** (opt-in) |
| Discussion Questions | 6 | On |
| Discussion Replies | 7 | On |

- Preferences are stored as **category × channel**, and only the feed channel is used in v1. Adding email later means adding a channel, with no migration.
- Every category can be muted, including Refund Request decisions and Open Refund Requests. They're all Notification Feed only, and each one has a page in the app behind it (e.g. `admin.refunds`).
- No global "mute all" in v1.

### Who sees which switch
Switches depend on what the person **is or has**, not their `UserRole`. The code lets any role make a Purchase, raise a Refund Request, buy a Team Licence (and so become its Team Admin) and claim a Seat.

- Refund Request updates: they have at least one Purchase.
- Seat claims: they're a Team Admin on at least one Team Licence.
- Enrollments, Discussion Questions: they're an Instructor.
- Open Refund Requests: they're a Platform Admin.
- Discussion Replies: everyone.

A switch that isn't shown keeps its default, so it can appear later (e.g. after a first Purchase) without anything having to be written.

### Defaults
All on except Enrollments. *How* the defaults get into each user's Knock `default` preference set (Knock has no environment default via the API) stays in the map's **User sync** fog.

### Where it lives and how it saves
- A new **Notifications** card on `/settings` (`app/routes/settings.tsx`), below Profile, with one switch per row and no channel column. The Notification Feed's bell popover links to it with a gear icon.
- Each switch saves when flipped, optimistically, with a toast if the save fails. The save goes through a Cadence action that **merges** the change into the user's preference set (`setPreferences` replaces the whole set by default).

### Standing rule: vendor behind Cadence-owned interfaces
No code outside an adapter touches Knock directly. There are two interfaces, both in Cadence's language (`enrollments`, the `feed` channel, etc.), and each adapter maps those names to Knock's category and channel keys:
- **Server:** triggering, preferences, user sync.
- **Client:** the browser still talks straight to the vendor (signed token, live connection), but the feed components only call a Cadence-shaped client interface (`listNotifications`, counts, `markRead`, `subscribe`…).

Swapping vendors then means writing new adapters. vitest can use a fake adapter.


<a id="reference-issue-21"></a>

## Reference #21: Does Knock hold up against Cadence?

Source status: closed.

## Question

Does Knock hold up against Cadence? Knock is our provisional vendor (see [Pick the notification vendor](decisions.md#reference-issue-16)). Spike it against the real app, and confirm it only if all four checks pass:

1. **Signed user tokens:** our server signs an RS256 user token for whichever user the DevUI switcher selects, and the feed authenticates with it. Switching users switches the feed.
2. **Triggering:** the Node SDK triggers one real catalogue Notification (e.g. Discussion Reply → question author), and it shows up in that user's feed.
3. **Headless feed API:** it covers listing items, the unread count, and marking items read/seen.
4. **Preferences:** category × channel preferences can express an entry that is off by default and opt-in (new Enrollment → Instructor).

If any check fails, reopen the vendor choice and fall back to **Courier**. This is about vendor fit, not the Feed's look; that belongs to [What does the Notification Feed look like in Cadence?](decisions.md#reference-issue-19).


### Source resolution 1

## Resolution: **Knock passes. We commit to it.** "Off by default" is set by Cadence, not by a Knock setting.

All four checks pass against the real app and the Knock Development environment. Courier isn't needed.

| Check | Result |
|---|---|
| 1. Signed user tokens | **Pass.** The server signs an RS256 token (`signUserToken`, `sub` = Cadence user id) for whichever user the DevUI selects. The browser reads that user's feed with only the public key and the token, so switching users switches the feed. A token for one user gets **403** on another user's feed. |
| 2. Triggering | **Pass.** `knock.workflows.trigger("discussion-reply", …)` from the Node SDK puts the Discussion Reply in the question author's feed within a few seconds. Passing the recipient inline (`{ id, name, email }`) creates or updates the user, so no separate sync is needed just to send. |
| 3. Headless feed API | **Pass.** `GET /v1/users/:id/feeds/:channel` returns entries plus `meta.unread_count` / `unseen_count` / `total_count`. `POST /v1/messages/batch/{seen,read,unread}` works straight from the browser (CORS is fine with the public key and user token). |
| 4. Opt-in-only preference | **Pass, with a caveat.** If a user's own preferences turn the `enrollment` category's in-app feed off, Knock creates no message at all. Opting in turns it back on and delivery resumes. *Where the default comes from* is the caveat, below. |

### The caveat: where "off by default" lives

- **Environment default preference set:** this is Knock's intended mechanism, but it can only be set in the dashboard. There's no API for it, each environment has its own copy, and workflow commits don't carry it. We couldn't find the control in the dashboard. (Rows in the "preference center" only control the preference UI; they don't set defaults.)
- **Tenant default (`knock.tenants.set` with `settings.preference_set`):** this didn't work. Messages triggered with `tenant: "cadence"` were still delivered with the default off, and we didn't find out why. Don't rely on it.
- **What works:** Cadence writes the default into each user's own `default` preference set itself (`enrollment` → `in_app_feed: false`), and opting in sets it to `true`. The prototype does this the first time an Instructor is the recipient of a new Enrollment, as a stand-in for doing it at user sync. The downside is that a user Cadence never set up would default to *on*.

### Gotchas for later tickets
- A workflow's **category only exists at runtime once the workflow is committed.** Our first `new-enrollment` runs had `categories: []`, so the category preference had nothing to match.
- Triggering a workflow that isn't committed returns a 404 ("workflow not found").
- **Seen isn't read:** marking items seen (the feed was opened) doesn't change `unread_count`. Calling `batch/*` with an empty `message_ids` returns a 422.
- Vite doesn't put non-`VITE_` `.env` values on `process.env`, so the prototype calls `process.loadEnvFile(".env")`.
- `users.setPreferences` replaces the whole preference set by default. Merge with the existing set when changing one key.

### Assets
- Prototype branch: `prototype/knock-spike`, shipped as a patch, [`knock-spike.patch`](https://gist.github.com/mattpocock/87be0d1df4945234bba66f775ade6768#file-knock-spike-patch). Apply it on a branch with `git am knock-spike.patch`. The page is `/prototype/knock` (`app/routes/prototype.knock.tsx`, `app/lib/knock-prototype.server.ts`).
- Dashboard setup wizard: `scripts/prototype-knock-wizard.sh` (in the same patch) creates the `discussion-reply` (category `discussion`) and `new-enrollment` (category `enrollment`) in-app workflows in Development. Both are committed.


<a id="reference-issue-22"></a>

## Reference #22: How does Cadence's Notification plumbing work against Knock?

Source status: closed.

## Question

How does Cadence wire Notifications to Knock? Covers the fog left on the map once every ticket closed:

- **Storage**: are Notifications kept in Cadence's own database, or only in Knock?
- **Triggering**: where each Notification fires, inline or deferred, what happens when Knock fails, and how a deleted Discussion Question or Reply removes its Notification
- **User sync**: keeping Cadence users in sync with Knock, writing default preferences, targeting all Platform Admins
- **Feed freshness**: live updates without hitting Knock's rate limit; bulk mark seen/read
- **Testing**: how vitest exercises triggering without hitting Knock

### Source resolution 1

## Resolution

Grilled with the map's owner. Every recommendation below was accepted.

### Storage
**Knock only.** Cadence stores no Notifications. The feed reads live from Knock through the client port, and a second copy would drift.

### Triggering
- **Inline, after the domain write commits.** A failure is caught and logged and never fails the domain action. There are no retries in v1: Notifications are best-effort. This is the opposite of today's Postmark refund emails, which throw after the commit.
- **Idempotency key per domain event**, e.g. `refund-approved:<refundRequestId>`, so a retry layer added later can't send duplicates.
- **Domain actions that fire Notifications move into `app/lib/*.server.ts` services** so they can be tested. This covers comment creation, Enrollment (`enrollUser`) and seat claim (`redeemCoupon`). The duplicated `createComment` in `courses.$slug.lessons.$lessonId.tsx` and `instructor.questions.tsx` becomes one function.
- **"All Platform Admins"**: at trigger time, query Cadence for every `role = admin` user and pass them as recipients. Role stays only in Cadence, so a role change needs no sync to Knock. A newly promoted admin sees only Open Refund Requests raised after the promotion.

### Deletion and edits
- When a comment is soft-deleted (`deletedAt`), archive the Notifications it caused: the Instructor's Discussion Question Notification, or the question author's Discussion Reply Notification.
- Each trigger puts the comment id in its trigger data. On delete, the server adapter lists the messages with the List Messages `trigger_data` filter (a flat JSON object of scalars) and archives them. If that filter doesn't work with the secret key during the build, fall back to a small comment id → Knock message id mapping table.
- Deleting a Discussion Question leaves the Discussion Reply Notifications under it in place, because those replies stay visible.
- Notifications are a **snapshot taken when they were sent**: editing a comment doesn't change them.

### User sync
- **Explicit sync at lifecycle points**: signup, a name change in `/settings`, Platform Admin edits in `admin.users.tsx`, and the seed. A one-off backfill script covers existing users.
- Sync identifies the user (name, email, avatar) and writes the default preference set **only if the user has none yet**. That means Enrollments off and everything else on, because Knock's environment default is dashboard-only.
- Role isn't synced. A failed sync is caught and logged, the same as a failed trigger.

### Feed freshness
- **Knock's real-time socket** (`@knocklabs/client` `listenForUpdates`, which joins the `feeds:<channel>:<user>` topic). One connection per signed-in user, in the client adapter. It feeds the bell badge and the open popover, and nothing polls.
- **The socket is torn down and re-authenticated** with a fresh signed token when the DevUI user switches.
- **Mark-seen on popover open and "Mark all as read"** use the client's bulk-by-channel status update (`bulkUpdateAllStatusesInChannel`), which runs on the user token. That covers Notifications that haven't loaded yet.

### Testing
- **The server port mirrors `MailTransport`.** It has a Knock adapter and an in-memory fake adapter that records triggers, syncs, preference writes and archives. Services take the port as an injected parameter, like `db` and `now`. No vitest test hits Knock.
- **Local dev without `KNOCK_SECRET_API_KEY`** falls back to a no-op adapter that logs, and the feed shows its empty state. This matches the `.outbox` fallback.

### Scope changes from this session
- Refund payout Notifications (Pending, Issued and Failed Refunds) are **out of scope**: they wait on Cadence tracking payouts, which is a separate effort.
- Writing the PRD isn't a ticket. The map's owner will write it from the closed tickets.
