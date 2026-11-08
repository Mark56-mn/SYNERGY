# TASK-007 — Member Identity & Profiles handoff

- **Task:** TASK-007 — Member Identity & Profiles
  (`task/TASK-007-member-identity-profiles.md`, §12 records this run)
- **Status:** **IMPLEMENTED** on the isolated database branch; design-board
  fidelity remains unverified (B-9). The earlier BLOCKED run is preserved in
  `task/TASK-007-member-identity-profiles.md` §10.
- **Branch:** `task/TASK-007-member-identity-profiles`
- **Base:** `6a10d64e639115753ba595e5f807151db2363c49` (TASK-006C)
- **Commits:** `111e1b0` (vertical slice) → `3eb4217` (privacy hardening) →
  documentation commit on the same branch
- **Database:** Neon project `ancient-band-38052550`, branch
  `br-steep-field-b3nti5ov` (`task-007-member-identity-profiles`), database
  `neondb`, server PostgreSQL 18.6
- **`main` / Production:** untouched. Nothing merged, nothing promoted, no
  Vercel deployment attempted.

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
