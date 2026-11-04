# TASK-011A — User reporting and blocking

Status: READY (in form) — start only after the relevant content/social/messaging tasks and G-1 approval.

Goal
Let users report and block and support mute/restrict controls, enforced consistently across surfaces.

Non-goals
- Full moderation policy/legal review (separate readiness item).
- Promises of anonymity or untraceability.
- Moderator access to private messages except user-reported or legally justified cases and recorded.

Acceptance criteria
- Block/report/mute/restrict controls exist and are enforced consistently across surfaces.
- Reporting starts a documented review workflow.
- Privacy and ownership enforcement continue to apply after reports/blocks.
- Block behavior prevents direct contact and profile interaction within reasonable technical limits.

Affected areas
- trust-and-safety, moderation, identity/profiles, content, messaging.

Risks
- Inconsistent enforcement across surfaces.
- Insufficient audit/review trail.
- Over-trust in client-supplied report context.

Test plan
- Block/report/mute/restrict enforcement tests.
- Ownership/visibility still enforced after reports/blocks.
- Negative access tests continue to pass.

Dependencies
- TASK-006/TASK-007/TASK-008/TASK-009/TASK-010 as applicable.
- `ADR-0009`.

Security / privacy impact
- Trust and safety controls must be enforced server-side and consistently. Private data must not leak through public surfaces or report flows.

Cost impact
- None incurred.
