# TASK-006B — Profile ownership and visibility

Status: READY (in form) — start only after TASK-006A and after G-1 approval.

Goal
Let a user create and update their profile, with deny-by-default ownership and visibility enforcement for private profile fields.

Non-goals
- Real payments, payouts, subscriptions.
- Community, feed, or marketplace features beyond what verifies profile ownership/visibility.

Acceptance criteria
- A user can read and update their own profile.
- A user cannot read another user’s private profile fields.
- A user cannot infer another user’s private fields from API shape or error differences.
- A user cannot update another user’s profile (server-side denial).
- Unauthenticated requests to protected profile endpoints are denied.
- Profile privacy/visibility fields are enforced at read time.

Affected areas
- profiles, identity linkage, visibility/privacy model, db schema/migrations.

Risks
- Private profile leakage through search, previews, feeds, caches, or API shape.
- Client-supplied visibility toggles treated as truth without server enforcement.

Test plan
- Implement the profile negative tests from `ADR-0009`.
- Owner vs non-owner read/update tests.
- Visibility-at-read tests.
- Malformed input tests.
- Cross-user access denial tests.

Dependencies
- TASK-006A identity and auth foundation.
- `ADR-0003` (authorisation model), `ADR-0009` (threat model).

Security / privacy impact
- Profile data is personal data. Private fields must never leak through public surfaces or error shapes. Owner-only mutation must be enforced server-side.

Cost impact
- None incurred.
