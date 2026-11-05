# Architecture Decision Record Index

> STATUS: RECOMMENDED — these decisions require owner review before implementation depends on them. They are draft proposals, not CONFIRMED product rules. See `AGENTS.md` and `DECISION_REGISTER.md` for the CONFIRMED / RECOMMENDED / UNRESOLVED distinction.

This register records material architecture choices so later agents and reviewers can see *why* a decision was made, what was rejected, and what the consequences are. It is created per `SYSTEM_ARCHITECTURE.md`.

| ID | Title | Status | Notes |
|-----|-------|--------|-------|
| ADR-0001 | Web application framework and rendering strategy | RECOMMENDED | Next.js (App Router) + TypeScript strict, server-first; alternatives recorded. |
| ADR-0002 | Android delivery path and its cost | RECOMMENDED | Installable PWA first for Phase 1; React Native/Expo only if an approved need emerges. |
| ADR-0003 | Authorisation model for Supabase Auth with a Neon-hosted database | RECOMMENDED | Service-layer deny-by-default + ownership/role checks; RLS on Neon only supplementary and only where the JWT/claim path is verified end-to-end. |
| ADR-0004 | Migration and data-access tooling | RECOMMENDED | One reviewed ORM/migration tool chosen in TASK-003 from Drizzle or Prisma; plain-SQL migration history is source of truth. |
| ADR-0005 | Media provider boundary (MediaProvider interface) | RECOMMENDED | Cloudinary adapter + local stub adapter; separate upload/asset/moderation/delivery seams; listing media capped 3 pictures/2 videos; video ≤ 3/10/30 min. |
| ADR-0006 | Repository layout and import boundaries for the modular monolith | RECOMMENDED | Proposed layout: route layer, `src/modules/<domain>`, `src/server`, `src/components/ui`, `src/lib`, `db/`, `docs/`; explicit server-only enforcement; no scaffold created. |
| ADR-0007 | Environment variable schema and secret handling plan | RECOMMENDED | Env names, descriptions, boot validation, dev/staging/prod separation, and the mechanical rule that prevents server secrets from reaching the client bundle; no secret values anywhere. |
| ADR-0008 | Quality tooling plan for the foundation scaffold | RECOMMENDED | Formatter, linter, typecheck, unit/integration test runner, accessibility check, secret scan, dependency audit — each with the exact command TASK-005 will adopt; no CI (gate G-5). |
| ADR-0009 | Threat model and data classification for the identity/profile slice | RECOMMENDED | Assets, actors, trust boundaries, top threats (account takeover, IDOR/BOLA, private-profile leakage, enumeration), and the named negative tests. |
| ADR-0010 | Cost and infrastructure proposal for Phase 0/Phase 1 | RECOMMENDED | Free-tier limits, what triggers paid usage, cheapest viable option per category; presented for approval, nothing purchased. |
| ADR-0011 | Phase 1 task breakdown and task-file specs | RECOMMENDED | Roadmap items 6–13 split into implementation-sized tasks with goal, non-goals, acceptance criteria, affected areas, risks, test plan and dependencies; task files created where a task is READY. |

Plus one reference document, not a decision:
- `docs/adr/0000-system-context-container-module-diagram-and-data-lifecycle.md` — system context, container/module diagram, trust boundaries, auth/session flow, media upload flow, deployment topology, data lifecycle, and an illustrative initial profiles/identity data model, with assumptions labelled.

Task-file conventions (adopted from the phased task-file header):
- Each Phase 1 task file is a complete task spec: goal, non-goals, acceptance criteria, affected areas, risks, test plan, dependencies, review notes.
- Status `READY` = may be started autonomously when its dependencies are satisfied and the gating approval is granted.
- Status `BLOCKED` = cannot start; reason recorded.
- Every task keeps the CONFIRMED / RECOMMENDED / UNRESOLVED distinction from `DECISION_REGISTER.md`. No task may silently promote a RECOMMENDED default to a CONFIRMED rule.
- Identity/authorisation scope for every task: Supabase Auth is the identity authority; Neon holds profiles/relations; authorisation is service-layer deny-by-default with ownership checks (ADR-0003). Payments are DEFERRED and excluded from MVP.
- `MVP_SCOPE.md` boundaries apply to every task; nothing below adds real payments, payouts, live streaming, AI logo generation, full SOAP governance product, or subscription tiers.
- Task numbering is roadmap-aligned. A task file is READY only when it is fully specified AND its dependencies are met AND any gating approval it needs is granted.

Register reconciliation note (Mission 01 recovery):
- This register was reconciled so it matches the actual deliverable set on `chore/autonomous-foundation-v1`. The surviving reference for system context, diagrams and data lifecycle is `docs/adr/0000-system-context-container-module-diagram-and-data-lifecycle.md`. The earlier standalone file `docs/adr/0006-system-context-and-container-module-diagram.md` is superseded by that reference document and is no longer the active deliverable. The earlier standalone `docs/adr/phase1-task-files-header.md` is folded into these conventions above.

For every ADR: context, options considered, decision, consequences, security/cost impact, and open dependencies. An ADR becomes CONFIRMED only after the owner approves it; material changes during implementation require a new ADR or a superseding entry.

**How to read these:** each decision below is labelled RECOMMENDED. That means: this is the default this plan proposes, it is coherent with the approved blueprint/MVP/architecture/security documents, and it should guide planning — but it must not become an irreversible product rule without human approval. If you disagree with any of them, the correct next action is to record that disagreement as an open item and request a decision; do not silently substitute another implementation.

Counts as of this register: ADR-0001 through ADR-0011, each appearing once; plus one reference document, `docs/adr/0000-system-context-container-module-diagram-and-data-lifecycle.md`, which is not an ADR.
