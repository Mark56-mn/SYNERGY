# SYNERGY Quality Gates

A task is DONE only when applicable gates pass and evidence is recorded. If the repository does not yet have a command, document that gap; do not invent a passing result.

## Every task
- Requirements mapped to acceptance criteria.
- Scope/diff reviewed; no unrelated changes.
- No secrets or sensitive user data committed.
- Formatting/lint and typecheck pass where configured.
- Relevant unit/integration tests pass.
- Build passes for affected packages.
- Error, loading, empty, success and disabled states covered where applicable.
- Accessibility and responsive behaviour reviewed for UI work.
- Security/privacy implications reviewed.
- Documentation and handoff updated.

## Implemented local gates (as of TASK-005)

No CI platform exists (G-5); every gate below runs locally and must be recorded with its command and exit code.

| Gate | Command | Notes |
| --- | --- | --- |
| Aggregate | `npm run verify` | Runs every required gate below in order, fails on any failure; `-- --strict-audit` also fails on advisories |
| Formatting | `npm run format:check` | Owner docs and planning records are excluded |
| Lint | `npm run lint` | ESLint flat config, `next/core-web-vitals` + `next/typescript` |
| Typecheck | `npm run typecheck` | All workspaces |
| Unit/component tests | `npm test` | Vitest; jsdom per file for UI suites |
| Accessibility | `npm test` (`tests/a11y/`) | axe-core 4.14.0. `color-contrast` cannot run under jsdom and is disabled with that reason; contrast stays a manual token review |
| Responsive | `npm run check:responsive` | Requires Playwright (out-of-tree install; reports NOT RUN with exit 2, never a silent pass) and a running dev server |
| Web build | `npm run build` | Production build of the web app |
| Secret scan | `npm run secret-scan` | Tracked-blob credential patterns; any hit is an incident |
| Import boundaries | `npm run check:boundaries` | Client layers may not import `src/server`; cross-module deep imports denied |
| Dependency audit | `npm audit` | Advisory status reported separately by `verify`; remaining findings and owner decision B-5 are recorded in `handoff/TASK-005.md` §6 |
| Android | `npm run android:typecheck`, `npx expo export --platform android` | Native build still requires JDK/SDK (see `handoff/TASK-003.md` §10) |

Operational notes: running `next build` while `next dev` is serving the same `.next` directory invalidates the dev server (broken RSC payloads, unloaded CSS) — restart it before browser-based checks. Browser checks are evidence of rendering; DOM-only tests are not a substitute.

## Feature-specific tests
- Auth: valid/invalid credentials, session lifecycle, rate limits, recovery and server-side authorization.
- Social/privacy: owner vs non-owner, private/public visibility, blocked users, reporting and content removal.
- Marketplace: provider acceptance, booking state transitions, 10-message pre-hire cap including voice notes, listing media limits.
- Media: file type/size validation, ownership, processing failures, access controls and cost limits.
- APIs: validation, authorization, rate limiting, idempotency where retries occur.
- Database: migration apply, constraints, cross-user isolation, rollback/forward recovery.
- Payments (future): signed webhooks, duplicate events, reconciliation, refunds, disputes and ledger invariants.

## Evidence format
Record exact command, exit status, concise output summary and commit SHA. Attach screenshots or recordings for major UI work where the execution environment supports them. Do not claim manual review that was not performed.

## Release readiness
No public release until critical user journeys, privacy, reporting/blocking, moderation, backup/restore, incident response, support and cost monitoring have been validated. Payment release has additional financial/provider/legal gates.
