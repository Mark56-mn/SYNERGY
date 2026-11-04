# TASK-002 — Architecture and Technology Implementation Plan

Status: READY
Priority: P0
Type: Architecture/planning (no implementation)
Dependencies: TASK-001 (DONE)
Approval: Human review of the output is required before TASK-003 (roadmap gate G-1)

## Goal

Produce an implementation-ready architecture and technology plan for Phase 0/Phase 1 that the owner can approve, so the scaffold (TASK-003) can be built without further design churn.

## Required work

1. **Architecture decision records** in `docs/adr/NNNN-title.md` (context, options, decision, consequences, security/cost impact, status) for at minimum:
   - ADR-0001 Web application framework and rendering strategy (compare at least Next.js App Router, Remix/React Router, SvelteKit, Vite SPA + API).
   - ADR-0002 Android delivery path and its cost (PWA-first vs React Native/Expo vs native Kotlin), including what changes in the repository if a second client is added.
   - ADR-0003 Authorisation model for Supabase Auth with a Neon-hosted database — because Supabase's `auth.uid()`/`auth.jwt()` RLS helpers are unavailable on Neon. Decide service-layer denial-by-default, request-scoped JWT claims with RLS, or a hybrid; state how it is tested.
   - ADR-0004 Migration and data-access tooling (Drizzle vs Prisma vs plain SQL runner), including migration review and rollback/forward-recovery expectations.
   - ADR-0005 Media provider boundary: the `MediaProvider` interface and why Cloudinary stays behind it (`SYSTEM_ARCHITECTURE.md` adapter requirement).
2. **Repository layout proposal** for a modular monolith consistent with `SYSTEM_ARCHITECTURE.md` domain boundaries: route layer, `src/modules/<domain>`, `src/server`, `src/components/ui`, `src/lib`, `db/`, `docs/`; explicit rules on what may import what, and how server-only code is prevented from reaching the client bundle.
3. **Required diagrams/documents** listed in `SYSTEM_ARCHITECTURE.md`: system context, container/module diagram, data model (initial profiles/identity slice), trust boundaries, auth/session flow, media upload flow, deployment topology, data lifecycle. Markdown diagrams acceptable; assumptions explicit.
4. **Environment and secrets plan**: env variable schema, `.env.example` contents (names + descriptions only), validation at boot, development/staging/production separation, and the mechanical rule that prevents server secrets from reaching client bundles.
5. **Quality tooling plan**: formatter, linter, typecheck, unit/integration test runner, accessibility check, secret scan and dependency audit, each with the exact command TASK-005 will adopt. No CI (gate G-5).
6. **Threat model and data classification** for the identity/profile slice: assets, actors, trust boundaries, top threats (account takeover, IDOR/BOLA, private-profile leakage, enumeration), and the negative tests that must exist.
7. **Phase 1 task breakdown**: split roadmap items 6–13 into implementation-sized tasks with goal, non-goals, acceptance criteria, affected areas, risks, test plan and dependencies. Update `ROADMAP.md` and create `task/` files for any task moved to READY.
8. **Cost proposal** for hosting and providers: free-tier limits, what triggers paid usage, and the cheapest viable option for each. Present for approval; purchase nothing.

## Non-goals

- No scaffolding, no `package.json`, no installs, no lockfile.
- No Neon/Supabase/Cloudinary project creation, configuration or sign-up.
- No feature implementation, no UI implementation (that is TASK-004).
- No changes to `MASTER_BLUEPRINT.md`, `DECISION_REGISTER.md` confirmed rows, `MVP_SCOPE.md` boundary or any owner-authored document beyond status/roadmap entries.
- No CI configuration, no deployment, no merge to `main`.

## Acceptance criteria

- ADR-0001…ADR-0005 exist with options, trade-offs, decision, consequences and security/cost impact; each is labelled RECOMMENDED pending approval.
- Repository layout is specific enough that TASK-003 can be executed mechanically, including import boundaries and server-only enforcement.
- The authorisation model is decided with a written test matrix covering permitted **and** denied paths for the initial protected resources.
- `MediaProvider` contract specifies request → signed upload → asset record → processing/moderation status → delivery, plus a local stub adapter so tests need no credentials; it encodes the 3-picture/2-video and 3/10/30-minute limits.
- Env schema, `.env.example` plan and secret-handling rule are specified; no secret value anywhere.
- Threat model and data classification exist for the identity/profile slice with the negative tests named.
- Costs are presented, not incurred; every recommendation is labelled RECOMMENDED.
- Roadmap updated; every task moved to READY has a complete `task/` file.
- No application code, no installs, no provisioning — evidenced by `git ls-files` and recorded commands.
- Handoff written; `handoff/CURRENT_STATUS.md` updated with the approval request.

## Risks

| Risk | Mitigation |
|---|---|
| Plan drifts into implementation | Non-goals above; verify with `git ls-files` that only docs changed |
| Framework choice made without considering lower-cost Android devices and slow networks | ADR must include a performance/bundle-size argument, not just ecosystem familiarity |
| Authorisation model chosen for convenience and refactored later | ADR-0003 is required before any data-access code exists |
| Paid service implied by a recommendation | Cost section must be explicit; provisioning is gate G-2 (owner action) |
| Two blueprint documents of unequal depth | Use `docs/SYNERGY_MASTER_PRODUCT_BLUEPRINT_v1.0.md` as the detailed reference and record any conflict instead of resolving it silently (D-01 still open) |

## Test plan (documentary verification)

1. Re-read each ADR against `MASTER_BLUEPRINT.md`, `MVP_SCOPE.md`, `SYSTEM_ARCHITECTURE.md`, `SECURITY_RULES.md`, `QUALITY_GATES.md`; confirm no CONFIRMED rule is contradicted.
2. Confirm every recommendation carries the RECOMMENDED label.
3. Confirm each READY task file contains goal, non-goals, acceptance criteria, affected areas, risks and test plan (`AGENTS.md` autonomous loop step 2).
4. Run `git status`, `git ls-files` and the secret scan; record output proving only documentation changed and no credentials exist.

## Security / privacy impact

Planning only; no control is implemented or claimed. The plan must specify: server-authoritative session verification, deny-by-default authorisation with ownership checks, parameterised queries, server-only secrets, signed media uploads, rate-limit points for auth/messaging/upload/search, audit-log coverage, PII redaction in logs, and the allowed/denied test matrix.

## Cost impact

None incurred. Hosting and provider options are proposed for approval.

## Stop conditions specific to this task

- If a recommendation would require a paid service, a new vendor or provisioning, stop and request approval.
- If the plan cannot satisfy a CONFIRMED decision, stop and record the conflict — do not propose violating it.
- If the owner has not resolved D-01 (blueprint precedence) and the two documents disagree on a requirement being planned, stop and ask.
