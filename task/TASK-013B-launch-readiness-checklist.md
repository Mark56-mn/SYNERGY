# TASK-013B — Launch readiness checklist

Status: READY (in form) — start only after the relevant Phase 1 tasks and G-1 approval.

Goal
Document and validate the launch-readiness items required before any public launch, and make known gaps explicit.

Non-goals
- Public launch before readiness is met.
- Payments launch before financial/provider/legal readiness.
- Legal compliance claims without qualified review.

Acceptance criteria
- Account security, reporting/blocking, privacy/terms, moderation workflow, backup/restore, incident response, support ownership, and cost alerts are documented and validated where applicable.
- Known gaps, risks, and dependencies are explicit.
- Nigerian legal review items are flagged as required before launch (NDPA 2023/NDPC, consumer protection, payments, advertising, tax, IP, marketplace) without claiming compliance.

Affected areas
- all Phase 1 domains, operations, quality gates, security, privacy, legal readiness.

Risks
- Launching before safety/operations/cost monitoring are ready.
- Claiming compliance/escrow/encryption/deletion/privacy guarantees without implementation and operational evidence.

Test plan
- Readiness checklist review with evidence.
- Confirm that critical journeys, privacy, reporting/blocking, moderation, backup/restore, incident response, support ownership, and cost alerts have been validated where applicable.
- Record open items and owners.

Dependencies
- TASK-013A end-to-end critical journeys.
- `ADR-0008` quality tooling.
- Launch-readiness review with owner/staff.
- Legal review gating where required.

Security / privacy impact
- This task is the gate that prevents launching with untested safety/privacy/operations. It must not be skipped or weakened.

Cost impact
- None incurred directly. Cost monitoring is a readiness requirement, not a purchase.

Note
Payments release has additional financial/provider/legal gates and is out of MVP scope.
