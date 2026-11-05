# ADR-0013 — Scaffold implementation tooling selections for TASK-003

Status: ACCEPTED EXECUTING PATH (implementation-record note; reversible local choices within an approved task, per `SYSTEM_ARCHITECTURE.md`. Higher-level product rules elsewhere remain their registered statuses.)

Context
ADR-0001 fixes the RECOMMENDED web framework family (Next.js App Router + TypeScript strict) and ADR-0008 fixes the quality-tooling categories; ADR-0004 leaves the exact ORM choice to the scaffold task; ADR-0006 requires the layout and import-boundary rules to be mechanically enforced. This record documents the concrete selections made before dependencies were installed, so the next agent does not have to re-derive them and no tooling switch happens silently.

Selections and reasons

1. Web framework — Next.js 15 (App Router) with TypeScript strict mode.
   Reason: the concrete version of ADR-0001's recommendation; matches the server-authoritative auth/secrets posture and the next.js server/client boundary requirement in ADR-0006.

2. Domain contracts and design tokens as shared workspace packages, consumed by both clients.
   - `packages/domain` — TypeScript types plus Zod validation schemas for the bounded contracts named in MISSION 02 (users/profiles, provider/business profiles, communities, content, listings, booking requests, messaging). Contracts only: no business rules, no module feature logic. Enquiry and booking-state enums are contract-level shapes, not verifications of business rules.
   - `packages/design-tokens` — the DESIGN_SYSTEM.md starter token values as a single shared source, exposed both as TS constants and as a CSS file the web app imports and the Android theme consumes.
   Reason: "do not duplicate business rules between web and Android" is mechanically satisfiable when both clients share one contracts package and one tokens package.

3. Repository layout — npm workspaces monorepo.
   `web/` (Next.js app; inside it the ADR-0006 layout `src/app`, `src/modules`, `src/server`, `src/components/ui`, `src/lib`), `packages/*`, `android/` (Expo app), `db/` (migration output and data-access tooling config), plus the existing `docs/`, `task/`, `handoff/`.
   Reason: one package manager and no build orchestrator dependency; symlinking plus Metro symlink support make shared packages consumable from both clients.

4. ORM / migrations — Drizzle ORM (node-postgres driver) with Drizzle Kit, chosen from the two RECOMMENDED options in ADR-0004 (Drizzle vs Prisma).
   Reason: schema sits in TypeScript beside each module, keeping ADR-0006's "each module owns its schema and queries via its public service" mechanical; migration output is reviewable SQL under `db/migrations` as the migration history source of truth; consistent with the modular-monolith lightness preference. No database is connected in this task: the client factory is lazy and used nowhere against a live Neon instance until G-2 provisioning.

5. Styling — Tailwind CSS 3.x in the web app, theme-mapped to the shared CSS design tokens (no color/spacing values authored twice).
   Reason: satisfies centralised tokens + consistent spacing/typography with minimal runtime cost (purged utility CSS) for a slow-network, low-end-Android audience. Tailwind is a build-time utility stylesheet, not a UI framework decision.

6. Quality tooling — Prettier, ESLint 9 flat config (Next + TypeScript), Vitest, plain Node scripts for secret scan; `server-only` package marker to make ADR-0006/ADR-0007's server-isolation rule mechanically enforced by the Next.js build. No CI is configured (G-5 unchanged).

7. Server boundary shape for this task
   - `web/src/server/env.ts` — one Zod-validated environment loader per ADR-0007, environment-aware requiredness, never printing secret values, read lazily at request/runtime time (never at module import, so builds need no credentials).
   - `web/src/server/auth/session.ts` — `SessionSource` interface; Supabase-Auth-backed implementation intended for G-2 integration; local test-double used in tests and labelled as such.
   - `web/src/server/authz/` — deny-by-default ownership/role helpers returning typed denials.
   - `web/src/server/http/` — handler wrapper: Zod input validation, session resolution, route-level rate-limit hook boundary, structured safe error mapping; `health` route public; an example owned-resource route exists only as the protected-boundary reference implementation.
   - `web/src/server/logging.ts` — redaction-aware structured logger.
   - `web/src/server/ratelimit.ts` — `RateLimiter` interface with an in-memory fixed-window implementation for local/test use only, documented as not a production control.
   - `web/src/server/db/client.ts` — lazy Drizzle client factory; parameterised access is the only access path; no connection performed in this task.

8. Android foundation — Expo SDK with Expo Router (see ADR-0012). Theme consumes `packages/design-tokens`.

Consequences
- One package manager, no monorepo framework, reviewable SQL migrations, one contracts package, one tokens package, build-enforced server isolation.
- Migration history starts empty by design: no table is introduced in this task (first migrations belong with the TASK-006 identity/profile slice, after G-2 provisioning decisions).
- The example protected-resource route is a foundation reference, not a product feature; it must be removed or replaced when real protected resources land with real (unlabelled) enforcement.

Not decisions
- This record changes no CONFIRMED row in `DECISION_REGISTER.md`, no ADR status, and does not provision or connect any provider.
- ADR-0003/0004/0006/0007/0008 remain RECOMMENDED product-planning guidance; their contents are honoured here but their statuses are unchanged.
