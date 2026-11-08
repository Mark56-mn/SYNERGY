# TASK-007 — Member Identity & Profiles handoff

- **Task:** TASK-007 — Member Identity & Profiles
  (`task/TASK-007-member-identity-profiles.md`, §12 records implementation and
  §13 records the acceptance pass)
- **Status:** **IMPLEMENTED — ACCEPTANCE PASS INCOMPLETE** on the isolated
  database branch; design-board fidelity remains unverified (B-9), the
  responsive gate is NOT RUN, no Vercel Preview could be created or inspected
  from the agent environment, and owner Android acceptance remains pending.
  The earlier BLOCKED run is preserved in
  `task/TASK-007-member-identity-profiles.md` §10.
- **Branch:** `task/TASK-007-member-identity-profiles`
- **Base:** `6a10d64e639115753ba595e5f807151db2363c49` (TASK-006C)
- **Final branch HEAD at acceptance:**
  `2e8c59f58016ab23eb13228cb8f27cf2cecb3c9c`
- **Remote implementation commits on that HEAD:** `6108fdc` (vertical slice) →
  `8241834` (privacy hardening) → `2e8c59f` (documentation). The original
  pre-replay identifiers `111e1b0` and `3eb4217` no longer appear in the pushed
  branch history; they are preserved here for traceability only.
- **Database:** Neon project `ancient-band-38052550`, branch
  `br-steep-field-b3nti5ov` (`task-007-member-identity-profiles`), database
  `neondb`, server PostgreSQL 18.6
- **`main` / Production:** untouched. Nothing merged and nothing promoted. A
  Vercel Preview deployment was not created or inspected during the acceptance
  pass: the agent environment has no Vercel session, no `.vercel/` linkage and
  no `VERCEL_*` credentials (`npx vercel whoami` → "Logged out.").

## 1. What shipped

One coherent vertical slice, in the order the spec asked for it.

| Spec area | Delivered |
| --- | --- |
| §4A database + identity linkage | `web/src/modules/profile/schema.ts` — `profiles` table keyed by the Supabase Auth subject (`identity_id uuid`, UNIQUE), unique normalised `username`, `display_name`, bounded `bio`, `avatar_url`, `profile_visibility` enum (`public`, `private`), `created_at`/`updated_at`. Applied as `db/migrations/0000_nappy_vapor.sql` |
| §4B onboarding | `POST /api/v1/profile/onboarding` + `/onboarding` page. Idempotent: `ON CONFLICT (identity_id) DO NOTHING` then read-back, so a retry or an interrupted attempt resumes (`created: false`, 200). A lost username race is a 409 |
| §4C view + edit | `GET`/`PATCH /api/v1/profile`, `GET /api/v1/profiles/[username]`, `/profile`, `/profile/edit`, `/u/[handle]` now resolves real members (demo accounts still render as demo, truthfully labelled) |
| §4D privacy foundation | `public` \| `private` enforced in the service layer; a private profile is answered **404** to everyone but its owner (403 would confirm the handle exists). Public responses are built from a four-field allowlist |
| §4E design + responsive | `MemberProfileView` reuses the navy/mint tokens, `Avatar`, `Badge`, `Tabs` and the `aria-disabled` reserved-action pattern; honest empty states instead of invented follower/like counts. **Fidelity is not claimed** — see §5 |

Supporting change: `packages/domain/src/users-and-profiles.ts` now owns the
profile contract (username normalisation, bounds, visibility vocabulary,
strict onboarding/update schemas, public DTO allowlist). The old placeholder
listed a `followers` visibility value that no server could enforce before a
follow graph exists; it is removed deliberately, not forgotten.

## 2. Database verification (real branch, never production)

Connection identity was checked through Neon's own session settings, without
printing the connection string:

| Check | Result |
| --- | --- |
| `current_setting('neon.branch_id')` | `br-steep-field-b3nti5ov` (the isolated branch) |
| `current_setting('neon.project_id')` | `ancient-band-38052550` |
| `current_database()` | `neondb` |
| Server version | PostgreSQL 18.6 |
| State before migration | 0 user tables, no Drizzle history |

`npm run db:migrate` **exit 0** — "migrations applied successfully".

`node scripts/profile-live-check.mjs` — **12/12 checks passed**, exit 0:

- migration created `public.profiles`; enum is exactly `public,private`;
- onboarding inserts exactly one profile, and a retried onboarding inserts none;
- 8 identities racing for one handle → **1 created / 7 unique violations**;
- an update survives a **new connection** (real persistence, not a cache);
- a non-canonical handle is rejected by the CHECK constraint (`23514`);
- an unsupported visibility value is rejected by the enum (`22P02`);
- every row the run created is deleted again — **0 remaining**.

Rollback / forward recovery: the migration is additive (one table, one enum,
three indexes). Forward recovery is `npm run db:migrate`. Rollback is
`DROP TABLE profiles; DROP TYPE profile_visibility;` on the isolated branch
only — never on production, and not needed unless the slice is withdrawn.

## 3. Gates actually run (final tree)

| Command | Exit | Result |
| --- | --- | --- |
| `npm run format:check` | 0 | clean |
| `npm run lint` | 0 | clean |
| `npm run typecheck` | 0 | all workspaces |
| `npm test` | 0 | **25 files / 199 tests passed** |
| `npm run build` | 0 | Next production build; new routes present |
| `npm run verify` | 0 | aggregate: all required gates passed |
| `npm run secret-scan` | 0 | clean, 215 tracked files |
| `npm run check:boundaries` | 0 | clean, 88 files |
| `npm run db:generate` | 0 | 1 table, 9 columns, 3 indexes |
| `npm run db:migrate` | 0 | applied to the isolated branch |
| `npm run check:responsive` | 2 — **NOT RUN** | Playwright cannot start in this VM (no Chromium system libraries, no root). Not a pass, and no viewport claim is made |
| `npm audit --audit-level=high` | 1 | **19 advisories (2 critical, 3 high, 14 moderate)** — the pre-existing B-5 set, unchanged by this task |

New tests: `tests/profile-domain.test.ts`, `tests/profile-service.test.ts`,
`tests/profile-routes.test.ts`, plus `tests/helpers/profile-double.ts`
(a labelled in-memory repository double). They cover unauthenticated access,
user A vs user B, tampered bodies, private-profile 404s, username normalisation
and collisions, onboarding idempotency, rate limiting and DTO allowlists.
**Mock vs live is stated explicitly**: the suites use doubles; persistence is
proved only by the live script above.

## 4. HTTP behaviour verified (dev server and production server)

| Path | Dev | Production (`next start`) |
| --- | --- | --- |
| `/u/<public handle>` | 200, bio rendered, `identityId` absent from payload | 200, bio present, `identityId` 0 occurrences |
| `/u/<private handle>` (stranger) | 404 | 404, private bio 0 occurrences |
| `/u/<demo handle>` | 200 (demo labelling intact) | 200 |
| `/u/<unknown>` | 404 | 404 |
| `/onboarding`, `/profile` (signed out) | 307 → `/login?next=…` | same |
| `GET /api/v1/profiles/<public>` | `{profile:{username,displayName,bio,avatarUrl},isOwner:false}` | same |
| `GET /api/v1/profiles/<private>` | 404 `{"error":{"code":"not_found"}}` | same |

### Privacy finding worth carrying forward

The first version of `/u/[handle]` passed the **repository record** into the
view. Next's development async-debug channel serialises awaited server values,
so the RSC payload of a *404* contained the private row — auth subject,
timestamps and the `visibility: "private"` flag — even though the profile body
was correctly withheld. Found by inspecting the rendered HTML, not by reading
the code.

Fixed in `3eb4217`: the loader converts to an allowlisted DTO *before* anything
is returned, so no raw row exists as a value a renderer can serialise. Verified
clean in production; development HTML can still contain awaited values from
*inside* the service (a framework diagnostic, not a response contract), so
**do not treat dev-server HTML as a privacy-safe artefact**.

## 5. Design references — limitation (unchanged)

The two boards (`image_471bde6f.jpg`, `image_d8ec3e9b.jpg`) are still absent:
`/mnt/data` does not exist in this container, and no image is committed
anywhere in the repository. Per the spec, that is recorded rather than
requested again — and **no design-fidelity claim is made**. What the UI applies
is the spec's *written* description mapped onto existing tokens/components:

| Cue (spec §2) | Implementation |
| --- | --- |
| Navy background/surfaces | `bg-bg`, `bg-surface`, `border-border`; cover band is a token gradient (`from-primary/20 via-surface to-surface-raised`) |
| Mint accent, active tab | `primary` token on the Edit button and `Tabs` underline; `Badge tone="primary"/"warning"` for You/Private |
| Compact top action row | avatar + Edit profile (owner) or reserved Follow/Message (`aria-disabled` + `aria-describedby`) |
| Centered avatar, identity, bio | `Avatar size="xl"` with a border in the page background, `h1`, `@handle`, bio or an honest empty line |
| Statistics | Deliberately none: follower/like counts belong to the tasks that create them |
| Content tabs | `Tabs` (About/Posts/Media) with real empty states |

B-9 stays open: committing the boards is a one-step owner action that converts
this table from a plan into reviewable evidence.

## 6. Security and privacy review

- Identity comes only from the verified session (`requireAuthenticatedUser`);
  no method accepts a user id from request data, and the request schemas are
  strict, so a body carrying `identityId`/`userId` is a 400, not an assignment.
- Ownership is enforced in the `WHERE` clause (`identity_id = verified user`),
  so cross-user writes have no code path.
- Private profiles are indistinguishable from missing ones (404), with no
  error-message difference.
- Public responses use an explicit allowlist; the auth subject, internal id,
  timestamps and visibility never reach an anonymous caller.
- Mutations require a same-origin `Origin` (CSRF), are rate limited, and return
  field **names** only on validation failure. Logs carry no bio/avatar values.
- The connection string was never printed, committed or logged; `.env.local`
  was not modified (the platform already exports `DATABASE_URL`). No secret was
  added to the repository, and `scripts/profile-live-check.mjs` reads the URL
  from the environment only.
- No Supabase Auth setting, user, role or password was created or changed; no
  `service_role` key is used anywhere; nothing ran against production.

## 7. Known limitations

1. **No browser viewport pass**: `check:responsive` cannot run here, so
   360/414/1280/1440 rendering is **not verified**; only server-rendered HTML
   and status codes were checked. Layout was built with the existing
   mobile-first patterns but has not been seen in a browser.
2. **No agent-run signed-in flow**: exercising onboarding end to end requires a
   real session, which the owner holds. The API path is covered by route tests
   with a labelled session double, and the pages redirect correctly when signed
   out.
3. **Avatar is a URL field only** — not rendered as an image (no uploads, no
   `next/image` remote pattern). Initials stand in, and the form says so.
4. **Visibility is binary** (`public`/`private`). Follower-scoped visibility
   returns with the follow graph.
5. **Account deletion / erasure** is out of scope; deleting an Auth user does
   not cascade to `profiles`.
6. **Rate limiting is per-process in-memory**, like every limiter in this
   foundation — documented at the boundary, not a distributed control.

## 8. Files changed

Created: `web/src/modules/profile/{schema,repository,service,provider}.ts`,
`web/src/app/api/v1/profile/route.ts`,
`web/src/app/api/v1/profile/onboarding/route.ts`,
`web/src/app/api/v1/profile/username-availability/route.ts`,
`web/src/app/api/v1/profiles/[username]/route.ts`,
`web/src/components/profile/{MemberProfileView,ProfileForm}.tsx`,
`web/src/app/onboarding/page.tsx`, `web/src/app/profile/page.tsx`,
`web/src/app/profile/edit/page.tsx`,
`db/migrations/0000_nappy_vapor.sql` (+ `meta/`),
`tests/{profile-domain,profile-service,profile-routes}.test.ts`,
`tests/helpers/profile-double.ts`, `scripts/profile-live-check.mjs`.

Modified: `packages/domain/src/users-and-profiles.ts`,
`packages/domain/test/contracts.test.ts`, `web/src/app/u/[handle]/page.tsx`,
`web/src/app/account/page.tsx`, `web/src/server/http/errors.ts` (adds the
`conflict`/409 code), `web/next.config.mjs` (webpack `extensionAlias` so the
client graph can resolve the domain package's `.js` specifiers),
`db/drizzle.config.ts` (schema glob, `db/migrations`, env-supplied credentials),
`db/README.md`, this handoff, the task file and `handoff/CURRENT_STATUS.md`.

No dependency was added or upgraded.

## 9. Next task

**TASK-008 — Social Publishing** (repo queue also holds
`task/TASK-007A-content-publishing-ownership.md` and
`task/TASK-008-follow-graph-and-visibility.md`). It inherits a working
persistence pattern: module schema → generated migration → repository →
service → wrapped route → allowlisted DTO. Reuse it; do not invent a second
data-access shape. B-9 (design boards) and B-5 (dependency majors) remain open.

## 10. Owner-approved database unblock — 2026-11-08 (historical)

The earlier B-8 statement is superseded. An existing Neon project named **Synergy** was found in the connected account (project ID `ancient-band-38052550`, PostgreSQL 18, database `neondb`). The production branch was left untouched.

Owner approved proceeding with the existing project. A dedicated branch was created from production HEAD and verified ready:
- `task-007-member-identity-profiles`
- Branch ID `br-steep-field-b3nti5ov`
- Compute: 0.25 CU minimum and maximum
- No migrations or application data changes have been made.

A pooled connection string was generated for this dedicated branch. The privileged URI is deliberately excluded from GitHub, this handoff, chat and logs. The owner must add it as `DATABASE_URL` using FreeBuff's secure secret/environment-variable interface, and expose it to local web commands as `web/.env.local` (gitignored). Never put the value in the mission prompt or repository. The agent must verify the connection targets branch ID `br-steep-field-b3nti5ov`, never the production branch.

The design boards are available in the current ChatGPT project working files, but not yet in the FreeBuff container/repository. This remains an access limitation until they are made available to the agent; no design-fidelity claim is authorized before inspection.

**Resume point:** after secure environment setup, continue from §4A of the authoritative TASK-007 spec. Verify connection without printing secrets, generate/test migrations only on the dedicated branch, then complete onboarding, profile read/edit, privacy enforcement and tests. No production migration, main merge or Production promotion.

## 11. Final acceptance pass — 2026-11-08

### 11.1 Result

The implementation is **ready for owner acceptance except three explicitly open items**: no TASK-007 Vercel Preview could be created or inspected from this agent environment, authenticated Android profile acceptance remains **OWNER TEST REQUIRED**, and design/responsive acceptance remains unverified. Do not label TASK-007 accepted until those owner-side checks are complete.

### 11.2 Remote branch and commit verification

An authenticated `cloud_git fetch` was run for `task/TASK-007-member-identity-profiles`. The fetched remote and local HEAD both resolved to `2e8c59f58016ab23eb13228cb8f27cf2cecb3c9c`, with a left/right count of `0/0`, and the working tree was clean before documentation edits. The reported implementation commit was therefore present and current. No commit was rewritten or force-pushed.

### 11.3 Neon branch and migration verification

Using only the existing environment-supplied connection string, the agent verified without printing the value:

| Check | Returned value |
| --- | --- |
| `current_setting('neon.branch_id', true)` | `br-steep-field-b3nti5ov` |
| `current_setting('neon.project_id', true)` | `ancient-band-38052550` |
| `current_database()` | `neondb` |
| PostgreSQL version | `18.6` |

The migration journal is in the `drizzle` schema table `__drizzle_migrations` and contains one row for `0000_nappy_vapor` (hash beginning `79360fdc92e9`). `public.profiles` exists with `id, identity_id, username, display_name, bio, avatar_url, visibility, created_at, updated_at`; `profile_visibility` contains exactly `public,private`; there were **0 rows** before the live check. `npm run db:generate` reported **no schema changes**, so the migration was not rerun. `node scripts/profile-live-check.mjs` passed **12/12**, including branch/project/database identity, idempotency, concurrency and constraint checks, and reported `remaining=0` after cleanup.

### 11.4 Quality gates on exact HEAD

| Command | Exit | Evidence |
| --- | --- | --- |
| `npm run format:check` | 0 | all matched files use Prettier style |
| `npm run lint` | 0 | ESLint clean |
| `npm run typecheck` | 0 | web and Android workspaces pass |
| `npm test` | 0 | **25 files / 199 tests passed** |
| `npm run build` | 0 | Next.js production build succeeds; profile routes present |
| `npm run secret-scan` | 0 | clean, **236 tracked files** |
| `npm run check:boundaries` | 0 | clean, **88 files** |
| `npm run db:generate` | 0 | **no schema changes** |
| `npm run verify` | 0 | all required gates pass |
| `node scripts/profile-live-check.mjs` | 0 | **12/12** |
| `npm run check:responsive` | 2 | **NOT RUN** — Playwright unavailable in the agent VM |
| `npm audit --audit-level=high` | 1 | **unchanged B-5 set: 19 vulnerabilities (2 critical, 3 high, 14 moderate)** |

### 11.5 Privacy and access-control evidence

Two temporary profile rows were seeded through the verified isolated branch and removed afterward; no profile row remained.

Development server:

- `/u/accept_public` — **200**. The rendered page showed the public bio, but Next.js development async-debug frames contained the repository record with `id` and `identityId`. This is a development-only serialisation channel, not the production page payload.
- `/u/accept_private` — **404**. The private bio, display name and `identityId` had **0 occurrences** in the HTML/RSC response; the title was only `<title>SYNERGY</title>`.
- `GET /api/v1/profiles/accept_public` — **200** with exactly `username`, `displayName`, `bio`, `avatarUrl`, and `isOwner:false`.
- `GET /api/v1/profiles/accept_private` — **404** with `{ "error": { "code": "not_found", "message": "Profile not found." } }`.
- Signed-out `/onboarding`, `/profile`, and `/profile/edit` each returned **307** to the login route with the corresponding `next` path.

Production server (`npm run start` after the successful production build):

- `/u/accept_public` — **200**, public bio present, `identityId` occurrences **0**.
- `/u/accept_private` — **404**, private bio/display name/`identityId` occurrences **0**.
- `/u/amara.makes` — **200**, with demo content labelled demo.
- Public API — **200**, four-field DTO only; private API — **404**.
- Signed-out redirects matched the development behaviour.
- Metadata for the private 404 page contained only the generic application title/value; it did not contain the display name.
- The service derives identity from the verified session only. Strict request schemas and route tests prove that body-supplied `identityId`/`userId` mass assignment is rejected; a cross-user write has no code path. The owner view is exposed through the owner DTO/API only. A genuine signed-in owner session was not available to the agent, so owner-side persistence across sign-out/sign-in remains **OWNER TEST REQUIRED**.

### 11.6 Vercel Preview

No deployment was created, identified, or inspected in this pass. The agent environment has no Vercel session, no `.vercel/` linkage, and no `VERCEL_*` credentials (`npx vercel whoami` returned "Logged out."). No deployment ID, Preview URL, build log, or deployed SHA can be claimed from this environment. The intended deployment target if owner-side Vercel access is used is **exact HEAD `2e8c59f58016ab23eb13228cb8f27cf2cecb3c9c`** on branch `task/TASK-007-member-identity-profiles` as a **Preview only**. Do not promote it to Production. No Supabase Auth setting, production Neon branch, `main`, or Vercel production environment was changed.

### 11.7 Owner Android acceptance checklist — OWNER TEST REQUIRED

After the exact Preview above is available:

1. Open the Preview URL on Android.
2. Sign in with an existing test account, or register a test account if needed.
3. Complete onboarding with a unique username and display name.
4. Add a short bio and save.
5. Open the profile and confirm the saved details appear.
6. Edit the bio and save again.
7. Refresh the page and confirm the changed details remain.
8. Sign out and sign back in.
9. Confirm the same profile and edited details remain.
10. While signed out, open the public profile URL and confirm only the approved public fields appear.

If the account is already onboarded, do not create a duplicate profile. Use the existing profile and report whether it remains intact.

Privacy check with a second test account, if available:

1. Set that account's profile visibility to `private`.
2. Open its profile from the first account or a signed-out browser.
3. Confirm the response is **404**.
4. Confirm no private bio, identity subject, internal ID, or private metadata appears.

Do not report passwords, cookies, access tokens, or secret environment values in the result.

### 11.8 Responsive and design status

`npm run check:responsive` exited **2 — NOT RUN** because Playwright is unavailable in the agent VM. Therefore **no browser viewport acceptance claim is made** for 360, 414, 1280, or 1440 px. The original design boards are still absent from the agent environment and from tracked repository paths, so no fidelity comparison was possible. Needed before design acceptance: `docs/design/image_471bde6f.jpg` and `docs/design/image_d8ec3e9b.jpg` (or an equivalent documented path), plus a browser-capable verification environment.

### 11.9 Remaining blockers and next action

1. **Vercel Preview:** deploy/inspect exact HEAD as a Preview using authenticated Vercel access and record deployment ID/URL/SHA.
2. **Owner acceptance:** complete the Android checklist above and report each result.
3. **Design/responsive:** supply the two boards and run real browser checks at 360/414/1280/1440 px.
4. **Next task:** only after these decisions, start **TASK-008 Social Publishing** as a separate task. Do not merge `main`, promote Production, change Supabase Auth, or migrate the production Neon branch.
