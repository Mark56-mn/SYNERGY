# SYNERGY Delivery Roadmap

Statuses: BACKLOG, READY, IN_PROGRESS, BLOCKED, REVIEW, DONE. Only tasks explicitly marked READY may be started autonomously.

## Phase 0 — repository and product foundation
1. TASK-001: inspect repository and document current state (**DONE** — `docs/REPOSITORY_ASSESSMENT.md`, `handoff/TASK-001.md`).
2. TASK-002: propose architecture and technology implementation plan (**READY** — `task/TASK-002-architecture-and-technology-plan.md`; dependency TASK-001 satisfied). Human review of its output is required before TASK-003.
3. TASK-003: define app/package scaffold and developer workflow (**BLOCKED** on TASK-002 approval).
4. TASK-004: implement design tokens and responsive application shell (**BLOCKED** on scaffold).
5. TASK-005: establish test, lint, typecheck and build gates (**BLOCKED** on scaffold).

## Phase 1 — MVP product capabilities
6. Identity and profile foundation.
7. Social feed and basic publishing.
8. Follow graph and privacy enforcement.
9. Provider/business profiles and listing discovery.
10. Enquiry workflow and provider response.
11. Reporting, blocking and moderation foundations.
12. Communities minimum viable workflow, if validated in scope.
13. End-to-end testing and controlled launch readiness.

## Later phases
- Video pipeline and scalable media delivery.
- Messaging enhancements and calls.
- Payments, ledger, refunds and payouts (after provider/legal readiness).
- Creator monetisation and advertising.
- SOAP governance interface and protocol ecosystem.
- Subscriptions, partnership marketplace and advanced analytics.

Do not reorder around convenience. Update dependencies and reasons when evidence warrants a proposal. Any material scope change requires human approval.

## Approval gates on the critical path
- **G-1** TASK-002 output reviewed and approved before any scaffold exists.
- **G-2** Free-tier Neon / Supabase / Cloudinary development projects created by the owner before the identity/data slice (no cost may be incurred autonomously).
- **G-3** Payments remain outside MVP scope; separate provider, legal and financial readiness review required.
- **G-4** No public deployment and no merge into main without explicit authorisation.
- **G-5** No CI platform (including GitHub Actions) without approval.

## Change log
- 2026-11-04 — TASK-001 marked DONE after assessment; TASK-002 moved to READY. Phase structure unchanged.
