# SYNERGY Delivery Roadmap

Statuses: BACKLOG, READY, IN_PROGRESS, BLOCKED, REVIEW, DONE. Only tasks explicitly marked READY may be started autonomously.

## Phase 0 — repository and product foundation
1. TASK-001: inspect repository and document current state (**DONE** — `docs/REPOSITORY_ASSESSMENT.md`, `handoff/TASK-001.md`).
2. TASK-002: propose architecture and technology implementation plan (**DONE as documents, awaiting G-1 approval** — `task/TASK-002-architecture-and-technology-plan.md`, `handoff/TASK-002.md`; deliverables in `docs/adr/` and `task/`). Human review of its output is required before TASK-003.
3. TASK-003: application foundation — monorepo scaffold, shared contracts, web shell, server-side security boundary and Android foundation (**DONE** — `handoff/TASK-003.md`; 40 tests, web build and Android Metro export verified; `npm audit` findings documented).
4. TASK-004: responsive user experience — application shell, feed, discovery, profiles, communities, video presentation and design-system extension (**DONE** — `task/TASK-004-responsive-user-experience.md`, `handoff/TASK-004.md`; 55 tests, web build verified, rendered review at four viewports; all displayed content is fictional demo data).
5. TASK-005: extend the test and quality gates — accessibility automation, responsive regression checks, security-boundary cases, dependency triage and an aggregate verifier (**DONE** — `task/TASK-005-quality-and-security-gates.md`, `handoff/TASK-005.md`; 72 tests, axe-core suite, real-browser responsive gate, `npm run verify`; audit reduced 21 → 19 with the remainder owned by B-5).

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
- 2026-11-04 — TASK-001 marked DONE after assessment; TASK-002 documents completed locally and stopped at G-1 for owner approval. Phase structure unchanged.
- 2026-11-06 — TASK-005 DONE on `chore/autonomous-foundation-v1`: axe-core accessibility suite (8 tests, 2 real defects fixed), Playwright-based responsive gate over 6 viewports × 6 pages, 9 new security-boundary tests, `npm run verify`, and a verified single `postcss` override (21 → 19 advisories). No identity, schema, deployment or CI work; remaining advisories need owner decision B-5.
- 2026-11-06 — TASK-004 DONE on `chore/autonomous-foundation-v1`: responsive web experience (shell, feed, discovery, profiles, communities, video cards) on the existing tokens, 55 passing tests, all routes prerendered, rendered visual review at 360/414/768/1440 with three defects fixed. No persistence, auth, messaging, payments or deployment; Android remains foundation-only; TASK-005 not started.
- 2026-11-06 — TASK-003 DONE on `chore/autonomous-foundation-v1`: monorepo scaffold (web, shared packages, db boundary, Android foundation), server-side security boundary, 40 passing tests, production web build and Android Metro export verified. Dependency audit findings documented, native Android build not run (no JDK/Android SDK), nothing deployed or merged, TASK-004 not started.
