# SYNERGY Roadmap

> STATUS: living document; CONFIRMED items are product decisions; RECOMMENDED items are planning defaults pending human approval.

## Guiding rules
- Ibadan-first; dark navy + mint; mobile-first; server-authoritative.
- Keep CONFIRMED / RECOMMENDED / UNRESOLVED distinctions; never promote a recommendation without human approval.
- Phase 1 is MVP scope as defined in `MVP_SCOPE.md`. Deferred, out-of-scope and conditional items live here with their gating decision.

## MISSION 01 — autonomous foundation (current)
MISSION 01 executes the foundation tasks in roadmap order and stops at each human-approval gate before continuing. As of 2026-11-04, the mission has completed TASK-001 and TASK-002.

| # | Task | Status | Gate | Notes |
|---|---|---|---|---|
| 1 | TASK-001 — Repository assessment | DONE | — | Assessment, blueprint transcription, next-task spec. Commit `4ecad1ecf18a44fd4ade4fd3b652e9bbad678b90`. |
| 2 | TASK-002 — Architecture and technology implementation plan | DONE | G-1 (owner approval before scaffold) | Planning only. ADRs ADR-0001..ADR-0006 + register index, layout proposal, env/secrets schema, threat model + data classification for identity/profile, Phase 1 task breakdown, cost proposal, handoff. Commit `a0d414ee2494e076bf91a9e73dba0f8634eae707b`. |
| 3 | TASK-003 — Scaffold web application repository | BLOCKED | G-1 must be granted first | Initial project scaffold, lint/typecheck/format hardpoints, no installs/provisioning/deployment/merge-into-main. |
| 4 | TASK-004 onward | BLOCKED | depends on prior gates and provisioning | Not yet reached. |

### Approval gates in MISSION 01
- G-1 — owner approves TASK-002 plan output before any scaffold (TASK-003).
- G-2+ — defined by later task specs when they are reached. Do not invent gates.

## Planned work by phase

### Phase 0 — before scaffold (planning only)
- TASK-001 (done)
- TASK-002 (done; waiting on G-1)
- Open decisions needed for downstream tasks:
  - D-01 Blueprint precedence (CONFIRMED normative source: `MASTER_BLUEPRINT.md` vs full transcription in `docs/SYNERGY_MASTER_PRODUCT_BLUEPRINT_v1.0.md`). RECOMMENDED: treat `MASTER_BLUEPRINT.md` as normative, keep the full transcription as reference. Not CONFIRMED.
  - D-02 Web vs Android approval. RECOMMENDED default already recorded in ADR-0001/ADR-0002. Not CONFIRMED.
  - D-03 Authorisation model approval. ADR-0003 is RECOMMENDED. Not CONFIRMED.
  - D-05 Provisioning for identity/data/media slices (free-tier Neon + Supabase + Cloudinary dev projects). Not started.
  - D-06 CI decision. Open.

### Phase 1 — web MVP scaffold and first slice
Not yet started; gate G-1 must be granted first. Outline (subject to change during planning):
- Scaffold repository, lint/typecheck/format/secret hygiene hardpoints.
- Identity + profile slice plumbing (Supabase Auth + Neon profile store).
- Authorization enforcement per ADR-0003.
- Core UI shell aligned to `DESIGN_SYSTEM.md`.
- First flow(s) within MVP_SCOPE.md.

### Later phases and deferred items
- Live streaming, real-time presence, advanced creator tooling, subscriptions/payments, mature moderation/governance product: deferred and/or conditional per `MVP_SCOPE.md` and decisions.

## Ownership and handoff
- Each completed task has a handoff under `handoff/` and an updated `CURRENT_STATUS.md`.
- The current branch is `chore/autonomous-foundation-v1`; it is not merged into `main`.
- Last milestone commit on this branch: `a0d414e` (TASK-002).

## Reading this document
- Roadmap items map to `task/` and `handoff/` files and to `docs/adr/` for architecture decisions.
- The roadmap does not authorise work; the task file and any relevant approval gates do.
