# TASK-007 — Member Identity & Profiles handoff

- **Task:** TASK-007 — Member Identity & Profiles
  (`task/TASK-007-member-identity-profiles.md`, authoritative spec, now
  annotated with the execution record)
- **Status:** **BLOCKED (2026-11-08)** — Stage 1 (source and design audit) is
  complete; the vertical slice did not start. The application database does not
  exist in this environment, and the reference boards are not present in this
  container.
- **Branch:** `task/TASK-007-member-identity-profiles`
- **Base:** `6a10d64e639115753ba595e5f807151db2363c49` (TASK-006C)
- **Branch tip before this mission:** `6f5e129` (the spec and status commits)
- **Final commit:** the documentation commit on this branch (recorded in the
  delivery report; this branch carries documentation only)
- **`main` / Production:** untouched. Nothing merged, nothing promoted.

## 1. Why the slice was not implemented

The spec's own rule (§5, §6): *"If a required prerequisite is absent, stop at a
safe interface and document the blocker; do not fake persistence or successful
operations."* The mission brief adds: *"If `DATABASE_URL` is missing, report the
exact blocker and stop database-dependent work rather than pretending
persistence works."*

`DATABASE_URL` is missing, and so is every equivalent. That is fatal rather than
inconvenient: §4A requires a real table and an applied migration, §4B/§4C
require reads and writes that survive refresh and a new session, and §4D
requires privacy enforced *in the data-access layer*. Every one of those is a
database operation. Implementing them against an in-memory store would be the
"frontend-only demonstration" the task exists to replace, and would make the
definition of done (§8) unverifiable by construction.

## 2. Environment evidence (names only; no value was read)

| Check | Command shape | Result |
| --- | --- | --- |
| Shell variables | `[ -n "${VAR:-}" ]` for `DATABASE_URL`, `NEON_DATABASE_URL`, `POSTGRES_URL`, `SUPABASE_DB_URL` | **all missing** |
| Repo env files | `ls .env* web/.env*` | `.env.example`, `.env.local`, `web/.env.local` only |
| Key presence in `.env.local` | key-name listing via `cut -d= -f1` | `APP_ENV`, `APP_ORIGIN`, `SUPABASE_AUTH_URL`, `SUPABASE_AUTH_ANON_KEY`, `MEDIA_PROVIDER_ADAPTER`, `LOG_LEVEL` — **no `DATABASE_URL`** |
| Key presence in `web/.env.local` | same | identical: auth keys only, **no `DATABASE_URL`** |
| Schema sources | `db/drizzle.config.ts` | `schema: []` — no module has a schema file yet |
| Migrations | `ls db/migrations` | directory does not exist (the identity slice owns the first) |
| Migration tool | `npm run db:generate` | exits 1 with "no schema files" — by design, recorded since TASK-005 |

Why this cannot be worked around inside the task's permissions:

- **Provisioning Neon is a paid-infrastructure decision.** `DECISION_REGISTER.md`
  D-013 records "Neon primary DB, Supabase Auth, Cloudinary initial media" as
  **RECOMMENDED DIRECTION**, not CONFIRMED. AGENTS.md requires human approval for
  paid services, and the spec forbids "paid infrastructure".
- **Switching the store to the existing Supabase project's Postgres** would
  silently overturn a recorded architecture decision and would require pulling a
  database credential out of the provider, which this mission is not authorised
  to do (no secret handling, no Auth-settings changes).
- **A local throwaway Postgres** would prove nothing about Neon, and the spec
  explicitly requires the real persistence path (§8: "Test actual Neon
  persistence … clearly separate live integration tests from mocks").

## 3. Design-reference audit (spec §2)

**Limitation, recorded as the spec instructs rather than asking the owner to
re-upload:** `/mnt/data/image_471bde6f.jpg` and `/mnt/data/image_d8ec3e9b.jpg`
do not exist in this container — `/mnt` exists but is empty — and the repository
contains no design images at all:

- `find . -iname '*.jpg' -o -iname '*.png' -o -iname '*.webp'` → zero results in
  tracked source; the only image that ever existed was TASK-006C's untracked
  `artifacts/006c-login.png`, which was removed with that work.
- `git grep -iE '471bde6f|d8ec3e9b|design board|reference board|mockup'` →
  `docs/REPOSITORY_ASSESSMENT.md:72` (records that six mockups were supplied to
  an earlier agent) and `docs/adr/0002` (a reference to the blueprint's mockup
  set). No image bytes are committed anywhere.
- No canonical copy exists under any design/asset/reference/mockup directory,
  because no such directory exists.

Consequence: **no claim of design fidelity is made.** What follows is an audit
mapping from the *spec's written description* of the boards to existing code —
it is a plan, not fidelity evidence, and it must be re-verified against the
images once they are committed.

### 3.1 Design mapping (description → implementation location)

| Reference cue (spec §2) | Existing expression in this repo | Where the profile slice must apply it |
| --- | --- | --- |
| Dark navy background and surfaces | `bg-bg` page, `bg-surface` cards, `border-border` — `packages/design-tokens` navy scale | New profile/onboarding pages must reuse `bg-bg` / `bg-surface`, not new colours |
| Mint/teal accent and active-tab treatment | `tone="primary"` on `Badge`/`Button`; mint `primary` token; `Tabs` active state | Edit Profile / Save buttons, active tab underline, availability "taken/free" states |
| Compact top bar with settings and Edit Profile | `web/src/components/shell/Sidebar.tsx` (desktop) + `BottomNav` (mobile); no profile-local top bar yet | Add a profile header bar with "Edit profile" + settings link; keep the shell untouched |
| Centered avatar, identity, short bio | `Avatar` (`size="xl"`, `seed`, `demo`), `h1` display name, `@handle`, `text-ink-muted` bio in `ProfileView` | Reuse the same block, but with real values and no `demo` badge once the DB backs it |
| Following/follower/like statistics | `dl` of posts/followers/following, each literally labelled `(demo)` | Keep the shape; render **honest** values (0 / "not available yet") until TASK-008–010 implement them |
| Horizontally switchable content area/tabs | `Tabs` component (Posts / About / Media) with `role="tabpanel"` | Keep tabs; posts/media panels become empty states, not fake content |
| Cover band | `demo-cover` utility class | Replace with a plain navy/token gradient when the profile is real; do not import demo styling |
| Reserved, not-built actions | Follow/Message use `aria-disabled="true"` + `aria-describedby` hint | Copy this exact pattern for any action whose backing feature is unimplemented |

## 4. Existing behaviour audited and to be preserved

- **Identity authority:** `web/src/server/auth/supabase-session.ts` verifies
  through Supabase Auth `/auth/v1/user` and fails closed; `SupabaseSessionSource`
  reads the bearer header, then the HttpOnly cookie. Roles come only from the
  verified source (`web/src/server/auth/session.ts`).
- **Authorisation:** `web/src/server/authz/index.ts` —
  `requireAuthenticatedUser`, `requireOwnership` (uniform denial, no existence
  oracle), `requireRole`. Deny-by-default.
- **Route contract:** `web/src/server/http/handler.ts` — `createApiRoute` gives
  session resolution, Zod validation (field names only in errors), per-identity
  rate limiting and uniform error mapping. New profile routes must use it, not a
  bespoke handler.
- **Rate limiting:** `web/src/server/ratelimit.ts`, configured through
  `RATE_LIMIT_MAX_PER_WINDOW` / `RATE_LIMIT_WINDOW_SECONDS` — the spec requires it
  on username availability and profile mutations.
- **DB boundary:** `web/src/server/db/client.ts` — lazy `pg.Pool` +
  `drizzle-orm/node-postgres`, parameterised access only, `getDb()` throws a
  value-free error when `DATABASE_URL` is absent. `web/src/server/env.ts` treats
  `DATABASE_URL` as optional in development and required elsewhere, listing
  variable **names** only on failure.
- **Module pattern:** `web/src/modules/example-owned-resource/service.ts` is the
  reference service (verified session → deny → ownership check → service-owned
  data access). Its header states it must be deleted or replaced when the first
  real module lands — the profile slice is that module.
- **Demo profile surface:** `web/src/components/profile/ProfileView.tsx` plus
  `web/src/app/u/[handle]/page.tsx` and `b/[handle]`, statically prerendered from
  `web/src/lib/demo-content.ts` with `generateStaticParams`. A real
  username-resolvable route must coexist with, or explicitly retire, these demo
  routes — discovery surfaces link to them today.
- **Owner-confirmed live auth:** the spec records the owner's successful
  test-account sign-in/sign-out on Preview
  `dpl_7CWeXAL4gQPWbD2ovnSTosNG92Rq` (`https://synergy-1ayluu193-drop2.vercel.app`,
  branch `task/TASK-006C-…`, commit `6a10d64`). This is owner-observed evidence,
  not an automated test. Note for future agents: anonymous access to that URL is
  still gated by Vercel Authentication (`302` → `vercel.com/sso-api`, API
  `401 "Protected deployment"` — `handoff/TASK-006C.md` §4.1), so no agent can
  re-run the owner's check unattended.

## 5. What was not built (and why), against spec §4

| Spec area | Status | Reason |
| --- | --- | --- |
| A. Database and identity linkage | **NOT STARTED** | No database (B-8); migration cannot be generated, applied or rolled back |
| B. Onboarding | **NOT STARTED** | Depends on A; availability checks need the unique index as authority |
| C. Profile view and edit | **NOT STARTED** | Depends on A; persistence is the acceptance criterion |
| D. Privacy foundation | **NOT STARTED** | Must be enforced in the data-access layer, which does not exist yet |
| E. Design fidelity and responsive | **NOT STARTED** | Board images unavailable (B-9); nothing to render |
| Gates / browser checks | Documentation gates only | No product code changed |

No file outside `handoff/` and the task file changed in this mission. No schema,
migration, route, component, dependency, environment variable or database
operation was added, attempted or applied.

## 6. Quality gates actually run

| Command | Exit | Result |
| --- | --- | --- |
| `npm run format:check` | 0 | "All matched files use Prettier code style!" |
| `npm run lint` | 0 | clean |
| `npm run typecheck` | 0 | all workspaces clean |
| `npm test` | 0 | **22 files / 158 tests passed** — the TASK-006C suite, unchanged; no profile test exists yet |
| `npm run build` | 0 | Next production build succeeds |
| `npm run secret-scan` | 0 | no credential patterns in tracked blobs |
| `npm run check:boundaries` | 0 | import boundaries hold |
| `npm run verify` | 0 | aggregate passes; audit reported as advisory, not a pass |
| `npm run db:generate` | 1 | expected: no schema files exist yet (unchanged since TASK-005) |
| `npm run check:responsive` | 2 — **NOT RUN** | Playwright cannot start in this VM (missing `libnspr4`/`libnss3`, no root); documented in TASK-006C, never reported as a pass |

All eight required gates passed on this tree (`verify` exit 0, "audit
advisories are known and documented (not a pass)"). `npm audit --audit-level=high`
remains exit 1 with the pre-existing B-5 advisories, unchanged by this mission.
Nothing here is claimed as live integration evidence.

## 7. Security and privacy review

- No secret value was read, printed, committed or logged; every environment
  check was a presence test on a variable name, and env files were inspected by
  **key name only**.
- No database connection was attempted, so no production data was touched and no
  experimental migration exists anywhere.
- No auth change: Supabase remains the sole identity authority; session, CSRF,
  cookie and ownership boundaries are untouched.
- No account, user, role or Auth setting was created or modified; the owner's
  test account was not used or referenced beyond what the spec already records.
- This document contains no user data, email address, token or connection
  string.

## 8. Blockers and owner actions

1. **B-8 (P0, blocks everything):** provide an isolated **non-production**
   Postgres. D-013 proposes Neon (recommended, not confirmed) — provisioning it
   is a paid-service decision that needs explicit approval; any equivalent
   serverless Postgres is acceptable if the owner prefers. Expose it as
   `DATABASE_URL` in approved secret storage (and in `web/.env.local` for local
   runs, which is gitignored). Nothing else about this task needs a decision.
2. **B-9 (P0 for §4E and §8.8):** commit the two reference boards into the
   repository, e.g. `docs/design/image_471bde6f.jpg` and
   `docs/design/image_d8ec3e9b.jpg`. One step, and every future UI task can then
   cite a path instead of a description.
3. **Optional:** relax Vercel Deployment Protection for previews so the
   owner-confirmed sign-in can be independently re-verified by an agent.

## 9. Smallest next action

Approve and provision the development database, set `DATABASE_URL`, and commit
the two boards. Stages A–E then run without further questions: schema →
generated migration → repository/service → onboarding and profile APIs → UI →
privacy and cross-user tests → browser checks at 360/414/1280/1440 → handoff.

## 10. Next task

**TASK-008 — Social Publishing**, per the spec's instruction (repo queue:
`task/TASK-007A-content-publishing-ownership.md` covers publishing and
`task/TASK-008-follow-graph-and-visibility.md` the follow graph). Both inherit
B-8: neither can persist content without the same database.
