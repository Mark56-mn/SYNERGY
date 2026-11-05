# MISSION 02 — Instruction (ready, not started)

This file is a prepared instruction for the next mission. It is written now so it can be handed off or triggered after owner approval. It is **not** started.

Prerequisites for start
- Owner approval of the TASK-002 architecture and technology plan output (gate G-1).
- Local HEAD of `chore/autonomous-foundation-v1` at commit `517a3ce91db1eb91c44b386dc93f0dd72d1ccc2e` or later that includes the TASK-002 deliverable set.
- The authenticated push path available if the completed TASK-002 documents are to be pushed.
- If Mission 01’s final remote verification and push were not completed, complete that first per `docs/MISSION_01_REMOTE_VERIFICATION_AND_PUSH.md`.

Decision context carried into Mission 02
- D-01: `docs/SYNERGY_MASTER_PRODUCT_BLUEPRINT_v1.0.md` is normative; `MASTER_BLUEPRINT.md` is the summary/navigation doc; `DECISION_REGISTER.md` is authoritative for individual decision status.
- ADR-0001: Next.js (App Router) + TypeScript strict, server-first — RECOMMENDED.
- ADR-0002: installable PWA first for Phase 1 Android; React Native/Expo only if an approved need emerges — RECOMMENDED.
- ADR-0003: service-layer deny-by-default authorisation with ownership/role checks and per-protected-resource negative tests; RLS on Neon only supplementary and only where the Neon-JWT path is verified end-to-end — RECOMMENDED.
- ADR-0004: one reviewed ORM/migration tool chosen from Drizzle or Prisma in the scaffold; plain-SQL migration history is source of truth — RECOMMENDED.
- ADR-0005: `MediaProvider` interface with Cloudinary adapter + local stub adapter; separate upload/asset/moderation/delivery seams; listing media capped 3 pictures/2 videos; video ≤ 3/10/30 min — RECOMMENDED.
- ADR-0006: repository layout and import boundaries for the modular monolith — RECOMMENDED.
- ADR-0007: env/secrets schema and secret-handling rule — RECOMMENDED.
- ADR-0008: quality tooling plan — RECOMMENDED.
- ADR-0009: threat model and data classification for the identity/profile slice — RECOMMENDED.
- ADR-0010: cost and infrastructure proposal — RECOMMENDED.
- ADR-0011: SOAP architecture note — RECOMMENDED.
- Reference doc: `docs/adr/0000-system-context-container-module-diagram-and-data-lifecycle.md`.
- Phase 1 breakdown: `docs/adr/phase-1-task-breakdown.md`.
- Phase 1 task files exist under `task/` as READY-in-form.

Mission 02 goal
Scaffold the repository for the approved architecture so later implementation tasks can proceed mechanically: project layout, lint/format/typecheck/test setup, server-only enforcement, env schema scaffolding, secret-scan and quality scripts, and the first migration/data-access placeholders needed to start the identity/auth foundation. Do not implement product features, do not provision providers, do not incur costs, do not deploy, and do not merge into main.

Mission 02 non-goals
- No product feature implementation.
- No provider project creation, credential configuration, or paid plans.
- No deployment.
- No merge into main.
- No changes to confirmed product rules or to owner-authored source-of-truth documents beyond status/roadmap entries.
- No resolution of open product decisions; where a decision is UNRESOLVED, stop and record, do not silently pick.

Mission 02 acceptance criteria
- Scaffold files exist and match ADR-0006 layout intent and ADR-0007 env/secrets intent.
- Server-only enforcement is in place so server-only code cannot reach the client bundle.
- Quality tooling from ADR-0008 is wired so the exact commands can be run and recorded.
- No secrets, connection strings, or provider keys in tracked files.
- No `package.json` or lockfile drift beyond what the scaffold intentionally creates.
- Handoff updated; `handoff/CURRENT_STATUS.md` and `ROADMAP.md` updated to reflect the scaffold and the next READY task(s).

Mission 02 stop conditions
- Stop and request direction if the owner has not approved G-1.
- Stop and record any conflict between the scaffold and a CONFIRMED rule.
- Stop before any provisioning or cost is incurred.

How to trigger this mission
Use the following instruction when the prerequisites are met:

"Start Mission 02: scaffold the SYNERGY repository per the approved TASK-002 plan. Use local HEAD `517a3ce91db1eb91c44b386dc93f0dd72d1ccc2e` on `chore/autonomous-foundation-v1` as the baseline. Implement the scaffold from ADR-0006, ADR-0007, and ADR-0008. Do not implement product features, do not provision providers, do not incur costs, do not deploy, and do not merge into main. Preserve all existing commits and documents. Update handoff/CURRENT_STATUS.md and ROADMAP.md. Stop for review before any implementation task that depends on provider credentials."
