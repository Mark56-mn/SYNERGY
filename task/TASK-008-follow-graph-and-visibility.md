# TASK-008 — Follow graph and visibility

Status: READY (in form) — start only after TASK-006 and G-1 approval.

Goal
Let users follow/unfollow and control profile/follow visibility, with privacy enforced consistently.

Non-goals
- Full hybrid-friend model beyond MVP unless a complete safe minimum can be delivered.
- Any feature that paywalls safety/privacy/reporting.

Acceptance criteria
- Follow/unfollow is owner-scoped; you cannot mutate someone else’s connections.
- Follow and profile visibility settings are honoured in feeds/listings.
- Privacy defaults do not leak private content through search, preview, feed, or API.

Affected areas
- profiles/social graph, feed/discovery, privacy model.

Risks
- Inconsistent privacy enforcement across surfaces.
- Enumeration of private state through response differences.

Test plan
- Follow mutation ownership tests.
- Visibility-honouring tests for feeds/listings.
- Cross-surface privacy tests.
- Negative access tests continue to pass.

Dependencies
- TASK-006 profile ownership/visibility.
- `ADR-0003`.

Security / privacy impact
- Social graph and visibility settings are personal data. Ownership and visibility must be enforced server-side and consistently across surfaces.

Cost impact
- None incurred.
