# SYNERGY

Nigeria-first social and commerce ecosystem connecting people, creators,
communities, businesses, products and services. Controlled initial launch:
**Ibadan, Nigeria**. Brand: dark navy + mint green.

Product source of truth: `MASTER_BLUEPRINT.md` (summary) +
`docs/SYNERGY_MASTER_PRODUCT_BLUEPRINT_v1.0.md` (normative 27-section
blueprint). Individual decision statuses live in `DECISION_REGISTER.md`.
Repository operating rules: `AGENTS.md`.

## Monorepo layout (ADR-0006, ADR-0013)

| Path                                      | What it is                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `web/`                                    | Next.js (App Router, React 19, TypeScript strict) application foundation                                                 |
| `web/src/app/`                            | Route layer (pages, layouts, API routes)                                                                                 |
| `web/src/modules/<domain>/`               | Domain modules owning their public service, schema and authorisation                                                     |
| `web/src/server/`                         | **Server-only** infrastructure: env validation, session verification, authorisation, DB boundary, logging, rate limiting |
| `web/src/components/ui/`                  | Shared UI primitives built from design tokens                                                                            |
| `web/src/lib/`                            | Pure utilities, no side effects                                                                                          |
| `packages/domain`                         | Shared TS contracts + Zod schemas (consumed by web AND Android)                                                          |
| `packages/design-tokens`                  | Single design-token source (TS constants + CSS)                                                                          |
| `android/`                                | Expo/React Native application foundation (see `android/README.md`)                                                       |
| `db/`                                     | Migration history and drizzle-kit config (no migrations yet — first ones arrive with the identity slice)                 |
| `docs/`, `docs/adr/`, `task/`, `handoff/` | Planning, decisions, tasks, handoffs                                                                                     |

Import boundaries (ADR-0006, mechanically checked):

- client-reachable code never imports `src/server/**` (also enforced at build
  time by the `server-only` marker package),
- cross-module access goes through a module's public service, never its internals.

`npm run check:boundaries` runs the second check.

## Getting started

```bash
npm install               # installs all workspaces, creates the lockfile
npm run dev               # Next.js dev server for the web app (localhost:3000)
```

Copy `.env.example` to `.env` for local values that differ from the defaults.
Development runs without providers (stub adapters, no database); never put
real credentials into any tracked file — real values live in per-environment
secret storage (ADR-0007). Nothing here provisions or connects a provider.

## Quality gates (local only — no CI is configured, gate G-5)

```bash
npm run format:check   # Prettier check
npm run lint           # ESLint (web)
npm run typecheck      # tsc across all workspaces (web, android, packages)
npm test               # Vitest suites (server boundaries + domain contracts)
npm run build          # Next.js production build of the web foundation
npm run secret-scan    # credential-shaped value scan over tracked files (stops on hit)
npm run audit          # npm audit (high+)
npm run check:boundaries  # ADR-0006 import-boundary check
```

Evidence contract: every task records the exact command, exit code, brief
output summary and the commit it ran at (`QUALITY_GATES.md`, ADR-0008).

## Android

`android/` is the Expo foundation. Its build verification needs the Android
SDK, which this workspace lacks — see `android/README.md` for the exact
commands and the recorded limitation. No store claims are made anywhere.

## Out of scope in this foundation (owner-gated)

No payments/commissions/creator payouts (D-015..D-019 unresolved or deferred),
no proven live media/cloud services until the owner provisions free-tier
projects (G-2), no public deployment (G-4), no CI platform (G-5), and no
merge into `main` without explicit authorisation.
