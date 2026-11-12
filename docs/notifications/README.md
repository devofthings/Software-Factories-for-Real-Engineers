# Notification reference adoption

On November 12, 2026, this project adopted Matt Pocock's completed in-app notification solution and its planning documents.

GitHub tracking: [Wayfinder: In-app notifications for Cadence](https://github.com/devofthings/Software-Factories-for-Real-Engineers/issues/9), [adopted PRD](https://github.com/devofthings/Software-Factories-for-Real-Engineers/issues/27), and [Finish Knock workflow setup, user backfill, and notification verification](https://github.com/devofthings/Software-Factories-for-Real-Engineers/issues/28).

- [Completed map](map.md)
- [Completed PRD](spec.md)
- [Completed decisions and prototype findings](decisions.md)
- [Eight completed implementation tickets and resolutions](implementation-tickets.md)
- [Original snapshot](reference-snapshot.json)
- [Previous project map](previous-map.md)

## Source and code

The source is the [07-spec-implement course snapshot](https://gist.github.com/mattpocock/87be0d1df4945234bba66f775ade6768#file-07-spec-implement-json), captured on October 8, 2026. The snapshot preserves every source issue, comment, status, dependency, and sub-issue link. The Markdown copies adapt issue references to local document links.

The shipped implementation is [c3609cf0c4719555820be7389b079fac9d468a43](https://github.com/ai-hero-dev/cohort-005-project/commit/c3609cf0c4719555820be7389b079fac9d468a43), `ship-in-app-notifications`. This commit is already an ancestor of our current branch. No reset or replacement of our project is needed. The notification feed, preferences, server adapters, and setup scripts were adopted from that checkpoint. Subsequent verification added a feed refresh on popover open and regression coverage for server-archived messages and initial load recovery.

## Adopted scope

V1 sends eight notification kinds through the in-app feed, with signed user tokens, live updates, and category preferences. Enrollment notifications are off by default. Existing direct refund emails continue.

This supersedes the previous plan to include notification email and browser web push in v1. Receipts, payout tracking, retry queues, and the earlier custom recipient rules are outside this adopted reference scope. Existing ticket history remains available. Historical source claims about credentials, test results, manual checks, and prices are evidence from Matt's environment, rather than verification of ours.

## Knock setup for another environment

1. Confirm the intended Knock environment and configure `KNOCK_SECRET_API_KEY`, `KNOCK_PUBLIC_API_KEY`, `KNOCK_SIGNING_KEY`, and `KNOCK_FEED_CHANNEL_ID` locally. Use signed user tokens with enhanced security enabled. The app expects `KNOCK_SECRET_API_KEY`. A prototype's `KNOCK_API_KEY` does not activate the shipped adapter.
2. Set `KNOCK_SERVICE_TOKEN` for the Management API, then run `npm run knock:push-workflows` to create and commit all eight in-app workflows and their preference categories. This command overwrites the matching workflow definitions. Review the target account first. `bash scripts/knock-wizard.sh` is the manual alternative.
3. Run `npm run knock:sync-users` to identify existing users and initialize missing preferences before enabling live notifications. Existing preference sets are preserved.
4. Verify the browser feed with DevUI user switching, live arrivals, seen/read controls, destinations, deleted-comment archiving, and an instructor's enrollment opt-in.
5. Run `npm run typecheck`, then `npm run test`, and resolve any local validation failures before treating the running app as complete.

## Verified Development setup

On November 12, 2026, setup and live verification were completed in the existing `devofthings` Knock Development environment. All eight in-app workflows were committed and verified as active and valid, and all 44 local users were synced. Enrollment notifications default to off. A sync performed after opting in preserved that choice, and verification restored the original preferences afterward.

Signed user authentication, rejection of access to another user's feed, DevUI switching across all four recipient roles, live arrivals, seen/read controls, notification destinations, and deleted-comment archiving were verified. The feed now refreshes on popover open to remove messages archived on the server without requiring a page reload or polling. Synthetic verification messages were archived, and the temporary discussion question was soft-deleted.

The local database was backed up before applying its two pending existing migrations with `npm run db:migrate`. Existing rows were preserved. Production was not promoted. The detailed verification record lives in the [setup and verification resolution](https://github.com/devofthings/Software-Factories-for-Real-Engineers/issues/28#issuecomment-6822341795).

## Current validation

`npm run typecheck` passed, followed by `npm run test` with **510 passing tests across 23 files**. `git diff --check` passed.

The refund integration test now uses the adopted purchase-specific contract, `RefundStatus.Open`, current Settings data, and HTTP 409 for duplicate requests. It uses the fake notification adapter and a mocked mailer. The historical prototype route uses generic React Router argument types and remains unregistered.
