# TASK-012 — Communities, if in MVP scope

Status: READY (in form) — start only if communities are confirmed in MVP and after the relevant social/privacy/trust tasks and G-1 approval.

Goal
If communities are in MVP, provide a safe minimum community workflow: public/private/hidden communities, admin/moderator roles, join approval, rules, and feeds.

Non-goals
- Full community feature set if a complete safe minimum cannot be delivered in MVP; defer the rest.
- Anything that weakens reporting/blocking/privacy foundations.
- Community features that paywall safety/privacy/reporting.

Acceptance criteria
- Public/private/hidden communities exist with admin/moderator roles.
- Join approval works as specified.
- Community feeds and rules are implemented only to the extent a complete safe minimum can be delivered.
- Reporting/blocking/privacy controls continue to apply.

Affected areas
- communities, feed/discovery, trust-and-safety, profiles.

Risks
- Scope overload; incomplete safe minimum.
- Privacy leakage through community discovery/feeds.
- Defending a feature that is not actually in MVP scope.

Test plan
- Membership/role/approval tests.
- Visibility and privacy tests across community surfaces.
- Negative access tests.

Dependencies
- TASK-006/TASK-008/TASK-011.
- Explicit scope decision on whether communities are in MVP and how much.

Security / privacy impact
- Communities have shared content and roles. Privacy, ownership, and reporting/blocking must remain consistent with the rest of the product.

Cost impact
- None incurred.

Note
If a complete safe minimum cannot be delivered in MVP, this task is deferred rather than partially built into an unsafe state.
