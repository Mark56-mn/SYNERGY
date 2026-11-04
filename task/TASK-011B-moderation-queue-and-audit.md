# TASK-011B — Moderation queue and audit

Status: READY (in form) — start only after TASK-011A and G-1 approval.

Goal
Provide a moderation queue foundation with least-privilege staff tools, reason codes, and auditLog.

Non-goals
- Full moderation policy/legal review (separate readiness item).
- Moderator access to private messages except user-reported or legally justified cases and recorded.
- Separation-of-duty guarantees that exceed what theMVP staff tooling can support.

Acceptance criteria
- Staff tools require least privilege and are auditable.
- Reason codes are captured for moderation actions.
- Sensitive/privileged actions are auditLogged.
- Separation of duties is considered in the tooling design.

Affected areas
- moderation, trust-and-safety, audit/operations, identity/staff roles.

Risks
- Over-privileged staff tooling.
- Missing audit trail.
- Inconsistent enforcement.

Test plan
- Least-privilege access tests for staff tools.
- AuditLog presence tests for privileged/sensitive actions.
- Reason-code capture tests.
- Negative access tests for unauthorised staff actions.

Dependencies
- TASK-011A user reporting and blocking.
- `ADR-0009`, `ADR-0003`.

Security / privacy impact
- Staff access to user data is high-risk. Least privilege, reason codes, and auditLog are mandatory; moderator access to private messages is limited to user-reported or legally justified cases and recorded.

Cost impact
- None incurred.
