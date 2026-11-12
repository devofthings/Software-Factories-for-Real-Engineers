---
status: accepted
---

# Determine refund eligibility from watched video at submission

Platform Admins review Open Refund Requests, inspect the Student's progress in the purchased course, and approve requests. Approval of an Individual Purchase ends the Student's Enrollment immediately unless a Claimed Seat still grants Enrollment for that course, as established in [ADR 0004](0004-an-enrollment-is-not-tied-to-a-purchase.md). Progress is retained in either case, separating access from learning history.

## Scope

This decision changes eligibility and the evidence used in Platform Admin review. Review, approval, and decline already exist in the application. The eligibility changes recorded here are accepted but not yet implemented. Payment processing, confirmation that money was sent, payment failures, and later progress deletion are deferred.

The review screen lists all Open Refund Requests across Students and courses. Each request shows the Student, course, original amount paid, request date, Student's reason, and progress. The eligibility evidence at submission must be distinguishable from current progress. The screen uses the app's existing Platform Admin authorization and sign-in flow.

## Agreed behavior

| Milestone | Enrollment and paid access | Retained progress |
| --- | --- | --- |
| Refund Request is open | Unchanged | Learning continues normally |
| Platform Admin approves the Refund Request for an Individual Purchase | Enrollment ends immediately unless a Claimed Seat still grants it for the course | Existing progress is retained |

Retained progress includes lesson completion, video positions, and quiz attempts and answers. Approval does not delete these records. Once Enrollment ends, the Student cannot continue accessing paid content or recording progress through that Enrollment.

Approval records the reviewing Platform Admin and decision time. An Approved Refund Request represents the decision to return money. It must not be presented as confirmation that money has already been returned.

## Watched video cutoff

For an Individual Purchase, a Student who has watched at least 20% of the course's video duration when submitting a Refund Request is ineligible. The cutoff measures watched video duration, not lessons marked complete. Being below 20% does not by itself establish eligibility, because other refund conditions still apply.

Team Licence eligibility continues to depend on Claimed Seats and the other existing rules, without applying the buyer's personal viewing history, as established in [ADR 0003](0003-team-licence-refunds-are-all-or-nothing.md).

Watched counts unique video content actually played. Replaying the same segment does not increase Watched, seeking past content does not count it, and playback speed does not change the duration of content counted. Playing one minute of content at twice normal speed counts as one minute of Watched.

Total course video duration is the sum of the actual lengths of all video lessons when the request is submitted. Lessons without video are excluded. Preserve this total with the request so later course edits cannot change its eligibility.

Viewing counts against the specific video version played and only contributes to a new request's percentage when that version belongs to the course at submission. Watching a removed or replaced video does not count as watching its replacement. Preserve the historical viewing records, and leave already submitted requests unchanged.

The 20% cutoff replaces both the existing 50% completed-lessons cutoff and the one-hour watched-time limit. Other eligibility rules remain in force.

Eligibility is locked when the Refund Request is submitted. Continued watching while the request is Open does not invalidate that request, even if the Student reaches or exceeds 20% before review. The Platform Admin reviews the eligibility established at submission rather than applying the cutoff to current progress.

Requests already Open when this rule takes effect retain the eligibility rules in force at their submission. Apply the new 20% rule to new requests, without retroactively invalidating existing requests using the new threshold or later viewing.

The decision uses the 20% watched video cutoff instead of a permanent one-approval-per-Student-per-course limit. A prior Approved Refund Request does not by itself make a later Purchase ineligible. Retained progress must not reset merely because a Purchase is refunded. The current implementation already allows requests on later Purchases and rejects an already approved request for the same Purchase.

## Insufficient viewing evidence

Historical viewing records may not establish unique content played, and missing or zero total video duration prevents a valid percentage. Accept these requests for manual review when the other eligibility rules pass, marking consumption eligibility as unknown. Unknown is neither 0% Watched nor an automatic reason for ineligibility.

Review evidence about viewing and course content at submission, without using subsequent viewing to invalidate the request. If consumption eligibility remains unknown, a Platform Admin may approve or decline with a recorded explanation. Preserve the unknown assessment alongside the decision rather than inventing a percentage.

## Implementation consequences

- Restrict both the review screen and approval action to Platform Admins. General staff authorization also admits Instructors and is not sufficient for this authority.
- Record approval and any required Enrollment removal together. Preserve Enrollment when a Claimed Seat still grants it for the course.
- Only Open Refund Requests can be approved. Repeated or concurrent submissions must not apply approval or access changes twice.
- Revoking access must prevent progress writes as well as reading paid content. Current progress actions do not consistently require enrollment.
- Preserve progress independently of Enrollment. Lesson, video, and quiz history belongs to the Student and content.
- Reflect approval in the Student's request status so the request does not simply disappear when it leaves the Open queue.
- Use the same agreed watched video measure in refund eligibility checks and the review screen. Preserve the eligibility evidence from submission so later progress does not change the decision basis. Current offer and submission checks both enforce 50% completed lessons and one hour of Watched time.
- Replace maximum-playback-position accounting with unique-content accounting. Historical position events cannot reliably reconstruct unique content played, so they must not be silently treated as measurements under the new definition.
- Use actual video lengths for the percentage rather than the current editable whole-minute lesson duration estimates. Preserve the total duration used at submission alongside the viewing evidence.
- Associate viewing with the video version played so a lesson's replacement video does not inherit the original video's Watched duration.
- Preserve the applicable eligibility rules and evidence for each request. Manual decisions on unknown consumption eligibility require a recorded explanation.

## Deferred retention policy

The earlier discussion established a 90-day retention window after an Issued Refund, using UTC calendar days and keeping the entire final day. Repurchase before expiration would restore progress and cancel deletion, while repurchase after expiration would start fresh. These later lifecycle rules are outside this change, including how eligibility history survives eventual progress deletion. Approval itself starts no deletion countdown.

## Rejected alternatives

Deleting progress at approval is rejected because loss of paid access does not erase the Student's learning history. Waiting for payment issuance to revoke access is also rejected because the Platform Admin has already approved ending the Purchase's entitlement.

Resetting eligibility on every Purchase is rejected because it could allow repeated purchase, progress, and refund cycles. A permanent one-approval limit is also rejected in favor of the 20% watched video cutoff. Rechecking the cutoff against progress at approval is rejected because eligibility is locked at submission.
