TASK-002 — architecture and technology implementation plan
Status: DONE — documents written, ready for owner approval at G-1 (no scaffold exists, no installs, no provisioning, no product code, no commits on existing CONFIRMED docs beyond status/roadmap entries).

Goal
Produce a planning-only architecture and technology plan for Phase 1 of the SYNERGY web application: ADRs, repository layout, env/secrets schema, quality tooling commands, a threat model + data-classification for the identity/profile slice, a Phase 1 task breakdown with acceptance criteria, and a cost proposal.

Result
- ADRs written as RECOMMENDED proposals:
  - ADR-0001: Next.js (App Router) + TypeScript strict, server-first web framework — RECOMMENDED.
  - ADR-0002: installable PWA first for Phase 1 Android; React Native/Expo only if a concrete approved need emerges later — RECOMMENDED.
  - ADR-0003: service-layer authorisation, deny-by-default, explicit ownership/role checks, parameterised queries, per-protected-resource negative tests; RLS on Neon only as a supplementary layer where the Neon-JWT path is verified end-to-end — RECOMMENDED.
  - ADR-0004: one reviewed ORM/migration tool chosen in TASK-003 from Drizzle or Prisma, with plain-SQL as migration history source of truth — RECOMMENDED.
  - ADR-0005: `MediaProvider` interface with Cloudinary adapter + local stub adapter; upload/asset/moderation/delivery as separate seams; listing media capped 3 pictures/2 videos; video ≤ 3/10/30 min — RECOMMENDED.
  - ADR-0006: system context, container/module diagram, trust boundaries, auth/session flow, media upload flow, deployment topology, data lifecycle, illustrative initial profiles/identity data model, labelled assumptions — RECOMMENDED (reference doc).
- ADR register index: `docs/adr/README.md`.
- Repository layout proposal: `docs/adr/0007-repository-layout-and-initial-files.md` — ADVISORY, no scaffold created.
- Env/secrets schema plan: `docs/adr/0008-env-and-secrets-schema-plan.md`.
- Threat model + data classification for the identity/profile slice: `docs/adr/0009-identity-and-profile-threat-model-and-data-class.md`.
- Phase 1 task breakdown with acceptance criteria: `docs/adr/phase-1-task-breakdown.md`.
- Cost proposal: `docs/adr/0010-cost-proposal.md`.

Still within TASK-002 scope but not yet a separate new document: env/secrets schema plan, quality tooling commands, threat model + data classification for identity/profile, Phase 1 breakdown, cost proposal — all written as ADRs/docs above.

Repo state after this task
- Branch: `chore/autonomous-foundation-v1`, tip `f43e3d2`.
- Changes relative to `f43e3d2`: only new untracked files under `docs/adr/`. No tracked files modified. No `package.json`, no scaffold, no installs.
- New files: `docs/adr/README.md`, ADR-0001..ADR-0006, `docs/adr/phase1-task-files-header.md`, plus the four above (ADR-0007..ADR-0010 and phase-1 breakdown).
- Note: after ADR-0006 was reviewed, its number was repurposed. The original v0 dashboard contents of ADR-0006 were an earlier misunderstanding of the task scope (an existing internal dashboard, not the product). It has been replaced with a real framework ADR (ADR-0006) and a separate reference diagram doc (ADR-0006 is now the DI step/diagrams & data-lifecycle reference). Cleanup annex removed; diagrams dataflow doc preserved.

Files created/changed by this task
- `docs/adr/README.md`
- `docs/adr/0001-web-application-framework-and-rendering-strategy.md`
- `docs/adr/0002-android-delivery-path-and-its-cost.md`
- `docs/adr/0003-authorisation-model-for-supabase-auth-with-neon.md`
- `docs/adr/0004-migration-and-data-access-tooling.md`
- `docs/adr/0005-media-provider-boundary.md`
- `docs/adr/0006-system-context-and-container-module-diagram.md`
- `docs/adr/phase1-task-files-header.md` (header conventions for the phase-1 task files)
- `docs/adr/0007-repository-layout-and-initial-files.md`
- `docs/adr/0008-env-and-secrets-schema-plan.md`
- `docs/adr/0009-identity-and-profile-threat-model-and-data-class.md`
- `docs/adr/phase-1-task-breakdown.md`
- `docs/adr/0010-cost-proposal.md`

Quality checks run
- Plan-level document review only (this is a planning task): verified that each deliverable is one document, that all recommendations are labelled RECOMMENDED, that CONFIRMED/RECOMMENDED/UNRESOLVED distinctions are preserved, that no scaffold/package.json/install is created, and that no secrets or provider credentials are written.
- No typecheck/build/test run yet — that is intentional: no product code exists and must not be installed before G-1 approval.
- Repo hygiene: confirmed only untracked docs under `docs/adr/` exist; no tracked files changed.

Blockers / open decisions
- D-01 Blueprint precedence: still not CONFIRMED. Current state: the full approved product blueprint is preserved at `docs/SYNERGY_MASTER_PRODUCT_BLUEPRINT_v1.0.md` and is consistent with `MASTER_BLUEPRINT.md` on every CONFIRMED decision. The recommended path is to treat `MASTER_BLUEPRINT.md` as the live CONFIRMED source and preserve the full spec as reference; that is RECOMMENDED, not CONFIRMED.
- D-02 Web vs Android approval: still not CONFIRMED. ADR-0001/ADR-0002 present the recommended default and its cost; owner approval is required before implementation depends on them.
- D-03 Authorisation model approval: ADR-0003 is RECOMMENDED; owner approval required because it is a security/auth architecture decision.
- D-05 Provisioning of free-tier Neon/Supabase/Cloudinary dev projects: not started; no accounts created; no secrets anywhere.
- D-06 CI decision: open.
- Phasing/tee tiers/cleanup: see MVP_SCOPE.md and decisions consolidation; the relevant decision/gate status is summarised in the docs, not rewritten here.

Gating approval
- This task is planning-only and intentionally stops at G-1: no scaffold, no installs, no provider projects, no deployment, no merge into main.
- Do not begin task/handoff `TASK-003` (scaffold) until the owner approves the architecture/technology plan output. The next mechanical step after approval is to scaffold the repository, NOT to provision accounts or deploy.

Next task
- TASK-003: scaffold the web app repository (initial project layout, lint/typecheck/format setup, architecture hardpoints). Still depends on G-1 approval being granted first.

Handoff for this task
- Written to `handoff/TASK-002.md` (created during this task).
- `handoff/CURRENT_STATUS.md` and `ROADMAP.md` updated to reflect TASK-002 as DONE and the next task + approval gate.
