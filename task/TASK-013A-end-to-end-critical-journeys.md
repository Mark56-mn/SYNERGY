# TASK-013A — End-to-end critical journeys

Status: READY (in form) — start only after the relevant Phase 1 tasks are implemented and G-1 approval has been granted.

Goal
Add end-to-end tests for the critical user journeys so the product’s main paths are verified against a real development environment or clearly labelled test doubles.

Non-goals
- Public launch without required readiness.
- Payments launch without financial/provider/legal readiness.
- Fake payment success or fabricated provider integration.

Acceptance criteria
- Critical journeys have automated end-to-end tests.
- The tests run against a real dev environment or clearly labelled test doubles.
- Auth, ownership, visibility, reporting/blocking, and listing/media cap behaviour are covered end-to-end where applicable.
- No real money movement or fabricated payment success is involved.

Affected areas
- all relevant Phase 1 domains: identity, profiles, content, feed, marketplace, messaging, trust-and-safety, media seam.

Risks
- False confidence from incomplete coverage.
- Tests that depend on unprovisioned providers without clear test doubles.

Test plan
- End-to-end tests for critical journeys.
- Negative/access-denial tests still pass end-to-end.
- Media/provider-dependent tests use the stub adapter or test doubles unless real provider projects exist and are intended for the test environment.

Dependencies
- TASK-006/TASK-007/TASK-008/TASK-009/TASK-010/TASK-011 as applicable.
- TASK-005 quality gates.
- `ADR-0005` media stub for tests without credentials.

Security / privacy impact
- E2E tests must not use real credentials in tracked files and must not create fake payment success. Use test doubles and environment-scoped secrets only.

Cost impact
- None incurred.
