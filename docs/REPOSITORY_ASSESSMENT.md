# SYNERGY — Repository Assessment (TASK-001)

**Task:** TASK-001 — Repository Assessment
**Date:** 2026-11-04
**Branch:** `chore/autonomous-foundation-v1`
**Base commit:** `83cc6d3f64dcff5b408c6bf39c39d23590a381a0` ("Initial commit", Mark56-mn, 2026-11-03)
**Remote tip of this branch at assessment time:** `d48a77295bb7e2123be4619c5f4cd7707ee6023d`
**Scope:** discovery and documentation only. No application code was created, no dependency installed, no service provisioned, no deployment performed.
**Method:** every claim below is backed by a command recorded in `handoff/TASK-001.md` §7 or by a file in this repository.

---

## 1. Summary

SYNERGY is a **greenfield repository with a complete governance and specification layer and no application code**. Fourteen tracked files: `LICENSE`, a one-line `README.md`, and twelve source-of-truth documents (operating contract, blueprint, decision register, MVP scope, architecture guardrails, design system, security rules, quality gates, roadmap, TASK-001, and two handoff files).

There is no framework, no package manager, no lockfile, no test suite, no linter configuration, no migration, no CI, no `.gitignore` and no `.env.example`. Consequently there is nothing to regress, nothing to refactor and nothing to preserve beyond documentation — but also nothing preventing accidental secret commits once code starts, which is the single most urgent hygiene gap.

The documentation layer is unusually strong for a repository at this stage and already resolves the questions that usually cause rework: identity authority (Supabase Auth), data store (Neon PostgreSQL), media provider (Cloudinary), architecture shape (modular monolith), decision status vocabulary, and explicit approval boundaries. **The assessment's main finding is therefore not "what is broken" but "what must be decided and in what order before the first line of product code is written."**

## 2. Inventory (verified)

| Area | Finding |
|---|---|
| Tracked files | 14 |
| Application code | none |
| Frameworks / libraries | none |
| Package manager / lockfile | none |
| Build, lint, typecheck, test commands | none — `QUALITY_GATES.md` correctly says to document the gap rather than invent a pass |
| Database, migrations, schema | none |
| Authentication / integrations | none configured; no credentials present |
| CI/CD | none (and `MASTER_BLUEPRINT.md` / `QUALITY_GATES.md` forbid GitHub Actions without approval) |
| Deployment configuration | none |
| `.gitignore` | absent — risk, see §5 R-02 |
| `.env.example` / env schema | absent — risk, see §5 R-02 |
| Secrets in tracked files | none found by secret scan |
| Branches | `main` (`83cc6d3`), `chore/autonomous-foundation-v1` (`d48a772` at assessment), platform branches `freebuff-base`, `freebuff/<chat-id>` |
| Remote | `origin` → `https://github.com/Mark56-mn/SYNERGY.git` |
| Automated tests | none exist; no behaviour is claimed to work anywhere in the repo |

## 3. Comparison with the approved documents

### 3.1 `MASTER_BLUEPRINT.md` vs current state

Every product domain in the blueprint (identity, social, video, communities, messaging, discovery, marketplace, creator economy, advertising, governance/SOAP, trust and safety) is **entirely unimplemented**. Nothing in the repository contradicts the blueprint; nothing implements it either.

The blueprint's own constraint — "do not build every long-term capability in the first release" — is consistent with a phased build, and `MVP_SCOPE.md` already defines the boundary. **No conflict.**

### 3.2 `MVP_SCOPE.md` vs current state

Phase 0 (foundation) is partially complete: repository conventions and documentation exist. Missing from Phase 0 per `MVP_SCOPE.md`:

- app/package architecture proposal (TASK-002, not yet done)
- design tokens and responsive shell (TASK-004)
- local quality scripts (TASK-005)
- environment variable schema and safe example files
- threat model, data classification and architecture decision record register (`docs/adr/` does not exist)

### 3.3 `SYSTEM_ARCHITECTURE.md` vs current state

No architectural violation exists because no code exists. Two requirements cannot be satisfied yet and are the critical design questions for TASK-002:

1. **`SYSTEM_ARCHITECTURE.md` requires an ADR register at `docs/adr/NNNN-title.md`.** The directory does not exist. The first ADR should be the stack decision from TASK-002.
2. **Supabase Auth + Neon PostgreSQL is a split-provider combination.** Supabase's row-level-security helpers (`auth.uid()`, `auth.jwt()`) live in the Supabase database. With the database hosted on Neon, those helpers do **not** exist, so "enforce authorisation … in database policies" must be solved either by (a) service-layer authorisation with explicit ownership checks plus parameterised queries, optionally with (b) Postgres RLS driven by a request-scoped JWT claim verified inside Neon. This is a real, avoidable source of rework and must be decided in TASK-002, not discovered during the first protected endpoint.

### 3.4 `QUALITY_GATES.md` vs current state

No gate can currently run: there is no formatter, linter, typechecker, test runner or build. The document anticipates this ("If the repository does not yet have a command, document that gap"). Gap closure is TASK-005 and is a prerequisite for claiming any later task DONE with evidence.

## 4. Duplicated and divergent documentation

The repository's `MASTER_BLUEPRINT.md` is a **55-line condensed summary**. The owner also supplied the full **`SYNERGY Master Product Blueprint v1.0` PDF (27 sections)** and six UI mockups as "the application blueprint".

Comparing both:

- **Consistent on every CONFIRMED decision**: Ibadan launch, dark navy/mint, social + commerce, individual and business providers, provider acceptance per booking, 10-message pre-hire cap, 3 pictures + 2 videos per listing, 3/10/30-minute video limits, 50% creator ad-revenue share, SOAP 50%-of-eligible-population / 90-day rule, coarse-only ad targeting, political ad conditions, Neon/Supabase/Cloudinary direction, no Firebase.
- **The full PDF contains material the summary omits**, all of which affects later phases: ad frequency defaults (first ad after 5 organic posts, then every 8–10, no consecutive ads), video ads muted by default, coarse targeting definitions, creator-pool deduction rules, monthly payout after fraud review, the proposed 60% participation quorum, voting eligibility defaults (90-day account age, verified email, 6 active days), the four subscription tiers, the Creator Partnership Marketplace, the Requirement that live streaming be deferred, the editable-balance prohibition, and the "no GitHub Actions without approval" rule.
- **Neither document fixes** the payment provider, commission schedule, subscription prices, payout thresholds, retention periods, or the exact definitions of "qualified watch time" and "net eligible advertising revenue".

Both documents were therefore treated as one source of truth, with the fuller PDF preserved verbatim-in-substance at `docs/SYNERGY_MASTER_PRODUCT_BLUEPRINT_v1.0.md` (see §8 D-01 for the precedence proposal). No existing file was modified.

## 5. Prioritised risks

| ID | Risk | Priority | Why it matters | Proposed mitigation |
|---|---|---|---|---|
| R-01 | No application scaffold, so no verifiable quality gates | P0 | Every later task claims evidence it cannot produce | TASK-003 + TASK-005 before any feature work |
| R-02 | No `.gitignore` and no `.env.example` while secrets become normal | P0 | The first provider key committed becomes a permanent incident; rotation required | Add both in the scaffold task (TASK-003) before any `.env` file exists |
| R-03 | Supabase Auth + Neon split means no built-in `auth.uid()` RLS | P0 | Authorisation design chosen late forces rewriting every data access path | Decide in TASK-002 with an ADR; default to service-layer denial-by-default plus negative tests |
| R-04 | No provider credentials (Neon, Supabase, Cloudinary) and no authorisation to create them | P1 | Blocks TASK-006+; risk of agents "simulating" integrations | Human provisioning of free-tier dev projects; explicit stub-vs-real test labelling |
| R-05 | Android delivery undefined (native, React Native, or PWA) | P1 | Affects repository layout, not just the client | Decide in TASK-002 (see §6.2); do not scaffold two clients |
| R-06 | Media cost exposure once video starts | P1 | Video is the dominant variable cost; a naive pipeline is unbounded | Upload/retention limits, Cloudinary behind an adapter, cost alerts, video pipeline scheduled after text/image (per `MVP_SCOPE.md`) |
| R-07 | SOAP ranking separation treated as a later feature | P1 | Ranking separation is architectural; retrofitting it means rewriting the feed | Represent organic/sponsored/marketplace ranking as distinct seams from the first feed model (design only, no SOAP implementation) |
| R-08 | Two blueprint documents of different depth | P2 | Future agents may implement from the summary and miss confirmed constraints | D-01 precedence proposal; full transcription committed |
| R-09 | No CI and no enforced gates | P2 | Discipline depends on each agent's honesty | Evidence format already mandated by `QUALITY_GATES.md`; consider CI later with approval |
| R-10 | Scope pressure (blueprint §24 "scope overload") | P2 | Attempting the full ecosystem produces a shallow demo | `MVP_SCOPE.md` boundary; one task per slice; deferrals already explicit |
| R-11 | Unresolved money semantics | P2 | Creator payouts, commission and provider are all open | Leave open; payments are explicitly out of MVP scope |
| R-12 | No legal documents | P2 | Cannot launch publicly without them | Flagged for pre-launch; not an MVP blocker |

## 6. Recommended architecture (RECOMMENDED — requires human approval)

Presented as a proposal for TASK-002 to refine and for the owner to approve. Nothing here is implemented or provisioned.

### 6.1 Web application

| Option | Strengths | Costs / risks | Verdict |
|---|---|---|---|
| **Next.js (App Router) + TypeScript strict** | Server-side rendering for slow networks; server components keep authorisation and secrets on the server; one deployment artefact for UI + API; largest ecosystem | Heavier than needed for a small team; hosting on Vercel becomes a paid dependency as usage grows (self-hostable alternative) | **RECOMMENDED** |
| Remix / React Router | Cleaner data-loading model, server-first | Smaller hiring pool, fewer integrations | Viable alternative |
| SvelteKit | Smallest bundles, excellent mobile performance | Smaller ecosystem for the admin/moderation tooling later | Viable alternative |
| Vite SPA + separate API | Simplest mental model | Two deployables; auth enforcement duplicated; worse first-paint on slow networks | Not recommended for this product |

### 6.2 Android

| Option | Strengths | Costs / risks | Verdict |
|---|---|---|---|
| **Installable PWA first, native wrapper later** | One codebase, no store review for MVP, works on lower-cost Android devices, zero added infrastructure | No Play Store presence at launch; limited background/push on some devices | **RECOMMENDED for Phase 1** |
| React Native / Expo | Store presence, shared TypeScript, good push | Second client to build and test; two design-system renderers | Recommended from Phase 2 onward if store presence is required |
| Fully native Kotlin | Best performance and platform integration | Doubles delivery cost; slowest path to a validated product | Defer |

### 6.3 Modular monolith layout (proposal)

```
app/                     routes (web) — thin, server-first
src/modules/<domain>/    identity, profiles, social, content, media, feed,
                         communities, messaging, marketplace, trust-safety,
                         notifications  (each: service, schema, policy, tests)
src/server/              server-only: sessions, authorisation, db client, adapters
src/components/ui/       design-token-driven primitives
src/lib/                 shared pure utilities and types
docs/adr/                architecture decision records
db/migrations/           ordered SQL migrations
handoff/  task/          workflow records
```

Rules: no cross-module imports except through a module's public service; `src/server/**` must never be imported by client components; adapters (`auth`, `media`, `notifications`, later `payments`) hide vendors.

### 6.4 Data and identity

- **Neon PostgreSQL** + one migration tool (Drizzle or Prisma — decide in TASK-002) with reviewed, ordered, additive SQL.
- **Supabase Auth** as the only identity source. Store `supabase_user_id` (UUID) as the profile key. No password column ever.
- **Authorisation:** service-layer guard on every protected operation, explicit ownership checks, parameterised queries, deny-by-default; negative tests required for each protected resource. RLS only if the split-provider JWT path can be verified end-to-end (see R-03).
- **Media:** `MediaProvider` interface (request upload authorisation → signed upload → asset record → moderation status → delivery URL with transforms). Cloudinary adapter + local stub adapter so tests need no credentials. Listing media enforced at 3 pictures / 2 videos; video length at 3/10/30 minutes.

### 6.5 Quality tooling (local only — no CI without approval)

Prettier · ESLint · `tsc --noEmit` · Vitest + Testing Library · Playwright for critical journeys · `npm audit` · secret scan before commit. Every task records exact commands, exit status and result.

## 7. Recommended staged sequence

1. **TASK-002 — architecture and technology plan** (planning only): ADRs for the stack, the Android path, the authorisation model and the migration tool; repository layout; adapter contracts; env schema; threat model and data classification. **Human review gate before any scaffold.**
2. **TASK-003 — scaffold and developer workflow**: framework init, TypeScript strict, formatting/linting, `.gitignore`, `.env.example`, config validation, folder boundaries, health check. No product features.
3. **TASK-004 — design tokens and responsive shell**: tokens from `DESIGN_SYSTEM.md`, primitives with all states, navigation shell (Home, Services, Create, Market, Profile), mobile-first and accessible.
4. **TASK-005 — quality gates**: run every gate locally and record baseline evidence.
5. **Phase 1 slice 1 — identity and own profile**: Supabase Auth sign-up/in/out/recovery, session verification server-side, profile read/update, and a test proving a second user cannot read or modify another profile. Requires provisioning approval (Neon + Supabase dev projects).
6. **Then, in order**: follow graph + privacy enforcement → basic publishing and feed (text/image) → provider/business profiles and listing discovery → enquiry workflow with the 10-message cap → reporting/blocking/moderation → end-to-end readiness review.

Rationale for the order: identity before content (everything is ownership-scoped), privacy before feed (so visibility is never retrofitted), moderation before marketplace (so abuse paths are closed when listings appear), and money never before a separate approval.

## 8. Decisions requiring human approval

| ID | Decision | Recommendation | Status |
|---|---|---|---|
| D-01 | Which blueprint document is normative: the 55-line `MASTER_BLUEPRINT.md`, the full PDF transcription at `docs/SYNERGY_MASTER_PRODUCT_BLUEPRINT_v1.0.md`, or both (summary normative, full as reference) | Treat the full blueprint as normative and reduce `MASTER_BLUEPRINT.md` to a pointer in a later approved edit | UNRESOLVED — no existing file was changed |
| D-02 | Web framework (Next.js) and Android path (PWA first) | As §6.1 / §6.2 | RECOMMENDED — needs approval |
| D-03 | Authorisation model for Supabase Auth + Neon | Service-layer denial-by-default + negative tests; RLS only if verifiable | RECOMMENDED — needs approval (ADR) |
| D-04 | Migration/ORM tool | Drizzle or Prisma, decided in TASK-002 | RECOMMENDED — open |
| D-05 | Provisioning of free-tier Neon + Supabase + Cloudinary **development** projects | Owner action; no cost may be incurred autonomously | BLOCKED on human |
| D-06 | CI provider | None yet; `MASTER_BLUEPRINT.md` forbids GitHub Actions without approval | UNRESOLVED |
| D-07 | Payment provider, commission, subscription prices, payout thresholds, retention periods, "qualified watch time" and "net eligible advertising revenue" definitions | Leave open; payments are outside MVP scope | UNRESOLVED (already recorded as D-015…D-020) |

## 9. Duplicated patterns and unnecessary complexity

- **No duplicated implementation exists** — there is no implementation.
- **One duplication to manage:** the blueprint now exists as a summary (`MASTER_BLUEPRINT.md`) and a full transcription (`docs/SYNERGY_MASTER_PRODUCT_BLUEPRINT_v1.0.md`). This is deliberate and documented (D-01), not accidental drift; it must be resolved by an owner decision rather than by an agent editing the summary.
- **Complexity to avoid:** the split-provider stack (Supabase Auth + Neon) is the one genuinely non-trivial constraint. It is manageable but must be designed once, explicitly (R-03), rather than discovered per endpoint.
- **Complexity already avoided:** no microservices, no MongoDB workload, no Kubernetes, no live streaming, no payment code — all correctly deferred by the approved documents.

## 10. What TASK-001 did not do (deliberate)

No scaffold, no installs, no `.env` files, no provider accounts, no database, no CI, no deployment, no changes to existing documentation, no product decisions taken. The only additions are this assessment, its handoff, updated status/roadmap entries, and the full blueprint transcription recovered from an earlier attempt (see `handoff/TASK-001.md` §6).
