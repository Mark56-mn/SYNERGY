# TASK-008D — Creator Follow Graph + Following Feed — handoff

- **Status:** **IMPLEMENTED — OWNER ACCEPTANCE PENDING (2026-11-15)**;
  uncommitted working tree at owner instruction
- **Approved task ID:** TASK-008D (2026-11-11 owner decision)
- **TASK-009A preserved:** it remains
  `task/TASK-009A-provider-profiles-and-listings.md`; it was not renamed,
  overwritten or renumbered
- **Requested name:** TASK-009A — Creator Follow Graph + Following Feed
- **Branch:** `task/TASK-008D-creator-follow-graph-and-following-feed`
- **Base:** `586ab99` (`task/TASK-008C-discover-and-explore` tip)
- **Database:** isolated Neon branch `br-steep-field-b3nti5ov` only; no schema
  change generated or applied
- **`main` / Production:** untouched
- **Specification:** `task/TASK-008D-creator-follow-graph-and-following-feed.md`

## 1. What was inspected

- Branch tips and linear ancestry:
  - `task/TASK-008A-main-social-feed` → `19c977a`
  - `task/TASK-008B-post-creation-studio` → `b150db8`
  - `task/TASK-008C-discover-and-explore` → `586ab99`
- Task files and handoffs for 008A, 008B and 008C.
- `task/TASK-008-follow-graph-and-visibility.md`.
- `task/TASK-009A-provider-profiles-and-listings.md`,
  `task/TASK-009B-listing-discovery.md` and
  `docs/adr/phase-1-task-breakdown.md` for the ID collision.
- `ROADMAP.md`, `MVP_SCOPE.md`, `MASTER_BLUEPRINT.md`, `SYSTEM_ARCHITECTURE.md`,
  `SECURITY_RULES.md`, `QUALITY_GATES.md`, `DESIGN_SYSTEM.md`,
  `DECISION_REGISTER.md`.
- ADR-0003 (authorisation), ADR-0009 (identity/profile threat model), ADR-0004
  (Drizzle/migrations), ADR-0011 (SOAP/following-feed control).
- Current implementation:
  - `web/src/modules/profile/{schema,service,provider,index}.ts`
  - `web/src/modules/posts/{schema,repository,service,provider}.ts`
  - `web/src/app/api/v1/feed/route.ts`
  - `web/src/app/api/v1/posts/[id]/like/route.ts`
  - `web/src/app/page.tsx`, `web/src/app/u/[handle]/page.tsx`,
    `web/src/app/discover/page.tsx`
  - `web/src/components/feed/MemberFeed.tsx`,
    `web/src/components/feed/MemberPostCard.tsx`,
    `web/src/components/profile/MemberProfileView.tsx`,
    `web/src/components/discovery/DiscoverExplore.tsx`
  - `packages/domain/src/{content,users-and-profiles,index}.ts`
  - `web/src/server/http/{handler,errors}.ts`, `web/src/server/auth/origin.ts`,
    `web/src/server/ratelimit.ts`, `web/src/server/db/client.ts`
  - `db/drizzle.config.ts`, `db/migrations/meta/_journal.json`

## 2. Baseline state and dependencies

| Slice | State | Notes |
| --- | --- | --- |
| TASK-008A | IMPLEMENTED — OWNER ACCEPTANCE PENDING | 30 files / 256 tests; live posts check 18/18; real posts/likes/topics and feed. |
| TASK-008B | IMPLEMENTED — OWNER ACCEPTANCE PENDING | 32 files / 268 tests; composer and upload; live Cloudinary upload unproven. |
| TASK-008C | IMPLEMENTED — OWNER ACCEPTANCE PENDING | 34 files / 281 tests; discover/search/creators; Preview behind Vercel SSO. |

The stack is linear A → B → C. 008C contains A and B. TASK-008D must branch
from `586ab99`. The three slices are **not DONE** by the repository's own
definition; their gates are recorded green but owner acceptance remains pending.
Do not describe 008D as accepted work before that happens.

TASK-008D adds the slice explicitly deferred by 008A (“following feed”) and
008C (“following a creator needs a backend table”).

## 3. Approved design decisions (2026-11-11)

1. **Task ID:** approved as **TASK-008D**. Do not rename or overwrite
   `task/TASK-009A-provider-profiles-and-listings.md`; it remains the
   provider/listings task.
2. **Simple accepted follows:** no requests, pending states, approvals, friends
   or favourites.
3. **Private profiles cannot be followed:** private/absent targets both return
   `404`; no edge is created. A followed creator who later goes private keeps the
   edge, but every read filters it. Returning to public reuses the edge.
4. **Binary visibility:** keep `public | private`; do not add `followers`
   profile/post visibility in this slice. The unused domain value stays unused.
5. **Following feed:** followed public creators **plus the viewer's own posts**,
   newest-first, chronological. Unrelated public posts are excluded.
6. **Counts only:** public `followers`/`following` counts; no list endpoints.
7. **Discovery stays link-only:** creator cards continue to open
   `/u/<handle>`; follow buttons on discovery/search cards are deferred.
8. **Private-profile follow requests:** may be considered in a future privacy
   task; they are not part of TASK-008D. Do not add request state or an inbox by
   implication.

## 4. Planned schema and API

### Schema

`web/src/modules/social-graph/schema.ts`:

- `follows(follower_identity_id, following_identity_id, created_at)`
- PK `(follower_identity_id, following_identity_id)`
- CHECK `follower_identity_id <> following_identity_id`
- indexes on `(following_identity_id, created_at desc)` and
  `(follower_identity_id, created_at desc)`

No cross-module FK to `profiles.identity_id`, matching TASK-008A's documented
module boundary. The service refuses targets without a visible profile. Orphan
cleanup belongs to a future account-erasure task; do not claim cascade behaviour
that does not exist.

Migration: generated `0003_*`, reviewed, applied only to the isolated branch
after verifying `neon.branch_id` / `neon.project_id`. Additive; dropping
`follows` destroys graph state only.

### Domain

`packages/domain/src/social-graph.ts`:

```ts
export const feedScopeSchema = z.enum(["for-you", "following"]);
export type FeedScope = z.infer<typeof feedScopeSchema>;

export interface FollowStateDto {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}
```

No identity ids, usernames, timestamps or auth subject. No mutation body schema:
follow/unfollow are path-addressed and body-less.

### Routes

| Route | Behaviour |
| --- | --- |
| `POST /api/v1/profiles/[username]/follow` | Auth + same-origin + 30/min. `200` FollowStateDto. Idempotent. |
| `DELETE /api/v1/profiles/[username]/follow` | Same; removes only the caller's edge; idempotent. |
| `GET /api/v1/feed?scope=following` | Auth + profile required; follows + own posts; existing cursor; `no-store`. |
| `GET /api/v1/feed` | Existing behaviour unchanged; missing/`for-you` scope. |

Errors: `401` anonymous; `403` no profile/cross-origin; `404` absent/private
target; `400` self-follow or invalid scope; `429` rate limit. No follower/
following list endpoints.

### Service rules

`social-graph` service:

- actor = `session.userId` only;
- target = normalised username from the path only;
- reject self; require actor profile; refuse private/absent target;
- insert `on conflict do nothing`; delete exact pair;
- return fresh counts after mutation.

`posts` service/repository:

- `listFollowingFeed` joins `follows` and `profiles`;
- `deleted_at is null`;
- `(profiles.visibility = 'public' OR posts.identity_id = viewer)`;
- existing cursor/order and DTO mapper;
- no follow edge grants private visibility;
- service re-filters defensively as the existing feed does.

## 5. Planned UI

### Profile

`web/src/components/profile/FollowButton.tsx` (new, client):

- signed out → `/login?next=%2Fu%2F<handle>` link;
- signed in → Follow / Following toggle with `aria-pressed`;
- pending disables and prevents double submits;
- success replaces state and count from the server response;
- failure keeps state, announces with `role="alert"`, allows retry;
- no optimistic state.

`MemberProfileView`:

- add real follower/following counts (`<dl>`) when state is available;
- replace only the reserved **Follow** action for non-owners;
- keep **Message** reserved and labelled;
- keep Edit profile for owner;
- update the old “Follow and message actions arrive” hint;
- preserve tokens/`Avatar`/`Badge`/`Tabs`/accessibility patterns;
- **do not touch** the postponed avatar lightbox/photo-expansion code.

`/u/[handle]/page.tsx`:

- load follow state in parallel with posts after the profile is resolved;
- on state failure pass `null` and omit counts/control rather than inventing
  state;
- no auth/session/private-404 change; only allowlisted DTOs cross the boundary.

### Following feed

`web/src/app/following/page.tsx`:

- anonymous → redirect `/login?next=%2Ffollowing`;
- signed in without profile → onboarding empty state;
- signed in with profile → server-render first page of following feed;
- DB failure → unavailable state, never demo posts;
- empty → explain followed-creators feed, links to discover/compose.

`FeedTabs` (new shared component):

- `For you` → `/`; `Following` → `/following`;
- `aria-current="page"` for active;
- home and following both use it.

`MemberFeed`:

- optional `scope` prop;
- append `scope=following` only for “Load more” on the following variant;
- default requests unchanged;
- following heading/subtitle changes;
- post card/like/share/delete behaviour unchanged;
- no follow buttons on post/discovery cards.

## 6. Security / privacy review

- Actor from verified session only; no body/query identity.
- Target resolved server-side from a public handle; no IDOR path.
- Private and absent targets share one `404` body.
- Feed visibility is enforced in SQL and re-checked in the service; a follow
  edge is not an entitlement.
- Stale follows to private creators are ignored by all reads.
- `FollowStateDto` is a three-field allowlist; tests must assert exact keys and
  absence of auth subject/identity ids.
- Mutations require same-origin; responses are `no-store`.
- 30/min follow writes per actor; existing feed limiter for reads.
- Logs: counts/field names only, never graph dumps, bodies or tokens.
- No auth/session/cookie/Supabase change.
- No follower/following list means no list enumeration surface in this slice.
- Account erasure/orphan cleanup is a documented later task; the graph is
  personal data and is not exported or used for recommendation.

## 7. Test plan

- `tests/social-graph-service.test.ts` — auth, profile requirement, idempotent
  follow/unfollow, self-follow, private/absent target, own-edge-only deletion,
  counts, DTO allowlist.
- `tests/follow-routes.test.ts` — 401/403/404/400/429, CSRF, `no-store`,
  duplicate POST, body cannot change actor/target, no subject leak.
- `tests/following-feed-route.test.ts` — anonymous 401, no-profile 403, invalid
  scope 400, followed-only plus own, unrelated public excluded, private/stale
  edge excluded, deleted excluded, cursor, no-store.
- `tests/follow-button.test.tsx` — signed-out link, follow/unfollow, pending,
  failure unchanged, accessible names.
- `tests/following-feed-ui.test.tsx` — server render, scoped load-more URL,
  empty/unavailable states, home default URL.
- Existing feed/profile/discover/auth suites remain green.
- `scripts/follows-live-check.mjs` — isolated-branch target check, table/PK/
  check/index, idempotency, counts, self-check rejection, private refusal,
  following visibility, cleanup 0 rows.
- Gates: format, lint, typecheck, tests, build, secret scan, boundaries,
  `db:generate`, `db:migrate` (isolated only), live check. `check:responsive`
  remains blocked by missing Chromium libraries; report NOT RUN and require
  owner phone verification at 360–412 px.

## 8. Files expected at implementation time

| File | Change |
| --- | --- |
| `web/src/modules/social-graph/schema.ts` | NEW `follows` table, PK, check, indexes |
| `web/src/modules/social-graph/repository.ts` | NEW parameterised graph queries and counts |
| `web/src/modules/social-graph/service.ts` | NEW actor/target auth, idempotent mutations, state |
| `web/src/modules/social-graph/provider.ts` | NEW lazy service + follow write limiter |
| `web/src/modules/social-graph/index.ts` | NEW read-only table export for feed JOIN |
| `packages/domain/src/social-graph.ts` | NEW `FeedScope`, `FollowStateDto` |
| `packages/domain/src/index.ts` | Export social-graph contracts |
| `web/src/app/api/v1/profiles/[username]/follow/route.ts` | NEW POST/DELETE |
| `web/src/app/api/v1/feed/route.ts` | Parse `scope`, pass to service |
| `web/src/modules/posts/repository.ts` | `listFollowingFeed` join |
| `web/src/modules/posts/service.ts` | `scope=following` auth/profile rule + mapping |
| `web/src/components/profile/FollowButton.tsx` | NEW client control |
| `web/src/components/profile/MemberProfileView.tsx` | Counts + Follow, Message stays reserved |
| `web/src/app/u/[handle]/page.tsx` | Load follow state, pass DTO |
| `web/src/app/following/page.tsx` | NEW gated following page |
| `web/src/components/feed/FeedTabs.tsx` | NEW link tabs |
| `web/src/components/feed/MemberFeed.tsx` | Optional following scope/heading |
| `web/src/app/page.tsx` | Add feed tabs |
| `db/migrations/0003_*.sql` + journal/snapshot | Generated reviewed migration |
| `tests/*`, `scripts/follows-live-check.mjs` | New coverage and live proof |

No production dependency, environment variable or auth change is expected.

## 9. Risks / blockers / conflicts

1. **TASK-009A ID collision — RESOLVED 2026-11-11.** The owner retained
   TASK-008D and directed that the existing provider/listings TASK-009A remain
   unchanged.
2. **Owner acceptance of TASK-008A/B/C — BLOCKING GATE.** Do not create the
   implementation branch, schema, migration or source changes until the owner
   completes §10 and explicitly authorizes TASK-008D.
3. **Follower-scoped visibility — RESOLVED for this slice.** The owner approved
   binary `public|private`; no `followers` value. Follower-scoped profile/content
   visibility remains a future privacy task.
4. **Following feed includes own posts — RESOLVED.** The owner approved followed
   public creators plus the viewer's own posts.
5. **TASK-007G5 profile/avatar branch is postponed and separate.** It edits the
   same profile component area and avatar lightbox. Do not rebase 008D onto it or
   modify those files. Resolve conflicts only when G5 resumes.
6. **Preview/SSO and Cloudinary credentials remain owner-blocked.** No agent
   claim of deployed/upload verification.
7. **`check:responsive` cannot run here.** Owner phone check required.
8. **No cross-module FK / account erasure.** Orphans possible only if a future
   deletion path lands; document and clean up there.
9. **In-memory limiter is per-process.** Existing documented boundary.
10. **Private-profile follow requests are not implemented.** The owner recorded
    that they may be considered in a future privacy task. Do not add request
    state or an inbox to TASK-008D by implication.

## 10. Owner acceptance checklist — TASK-008A/B/C (blocking gate)

The owner must complete this before TASK-008D implementation. Record the
observed result, account/session, URL and any limitation. **Do not mark a check
passed unless it was actually observed.** The agent has not performed these
checks and makes no claim that they pass.

### A. Publishing a post

- [ ] Sign in as a test member with a profile.
- [ ] Open `/compose`, write a caption, publish.
- [ ] Confirm the post appears on `/`, the member's profile Posts tab, and after
      a reload.
- [ ] Confirm a signed-out visitor can read the public post and cannot see the
      composer's post action as working.

### B. Liking from a second session

- [ ] Sign in as a second test member in a separate session/private window.
- [ ] Like the first member's post; confirm the count increments and survives a
      reload.
- [ ] Unlike; confirm the count returns and the state is per-member, not shared.
- [ ] Confirm the first member still sees the post and the correct aggregate
      count.

### C. Cloudinary media upload

- [ ] Confirm Preview has the Cloudinary variables and
      `MEDIA_PROVIDER_ADAPTER=cloudinary` scoped Preview-only.
- [ ] Upload a JPEG/PNG/WebP from the gallery through `/compose`; preview it,
      publish, and confirm the image renders after reload.
- [ ] Confirm the stored URL is an `https:` Cloudinary URL in the expected
      `synergy/posts` folder and that a non-image/oversize file is rejected.
- [ ] If the credentials are absent, mark this **BLOCKED**, not passed. The
      earlier live upload was not proven.

### D. Discover, search and trending

- [ ] Open `/discover`; confirm server-rendered results appear without relying
      on a client fetch.
- [ ] Search a caption, display name, username and `#topic`; test `%`/`_` as
      literal input.
- [ ] Select a trending/topic chip; confirm filtering and the pressed state;
      select it again to clear.
- [ ] Check Posts/Creators/Topics tabs and reload a `?q=`/`?topic=` URL.
- [ ] Confirm no private profile appears in search, creator suggestions or
      trending counts.

### E. Private-profile exclusion

- [ ] Set a second test member's profile to private.
- [ ] From the first member's session, confirm the private profile is 404 and
      its posts are absent from `/`, `/discover`, search, topics, the feed API
      and the profile API.
- [ ] Confirm the private owner can still see their own profile and posts.
- [ ] Set the profile back to public and confirm the expected visibility
      returns; note any caching delay.

### F. Mobile layout at 360px

- [ ] Check `/`, `/discover`, `/u/<handle>` and the signed-out `/compose` gate
      at 360 CSS px (or a real 360 dp phone).
- [ ] Confirm no horizontal overflow, the bottom navigation is usable, tabs and
      topic chips fit, and loading/empty/error states remain readable.
- [ ] Record the browser/device and, where possible, a screenshot. Automated
      `check:responsive` is currently NOT RUN because Chromium libraries are
      unavailable in this VM.

### G. Preview / SSO limitations

- [ ] Sign in to the Vercel account/team that owns the Preview before opening
      `https://synergy-git-task-task-008c-discover-and-explore-drop2.vercel.app`.
- [ ] Record the deployment ID, URL, commit SHA and READY state. Confirm the
      SHA corresponds to the 008C code commit; the docs commit may follow it.
- [ ] Confirm `DATABASE_URL` and Cloudinary variables are scoped to Preview and
      point to the isolated Neon branch, never Production.
- [ ] Note that the agent has no Vercel token/project link and cannot inspect
      the SSO-protected Preview. Do not treat a 302 to Vercel login as a passed
      app check.

### Sign-off

Reply with either:

- `TASK-008A/B/C accepted; TASK-008D implementation authorized.` plus any
  exceptions/limitations, or
- the specific failed/blocked checks and the required fix.

## 11. Next action

**The implementation gate is CLOSED.** Do not create the implementation branch,
write schema, generate/apply migrations, modify source, merge anything, or touch
`main` / Production / auth / the profile-avatar debugging area.

Repository restrictions remain in force: no implementation or database
migrations; no `main` or Production changes; no branch merges; no authentication
changes; no profile/avatar changes; no GitHub Actions; no unrelated repositories.

The next action is owner completion of §10 and explicit authorization. After
that:

1. Branch from `586ab99`.
2. Implement in the order in the specification §15.
3. Update `handoff/CURRENT_STATUS.md` and this handoff with real gate evidence.
4. Stop again at owner acceptance; do not merge.

## 12. Handoff completeness

A new agent should be able to resume from this file plus the specification
without repeating discovery. Task ID, binary visibility, own-post inclusion and
the privacy-task boundary are approved.

## 13. Implementation record — 2026-11-15

**Status: IMPLEMENTED — OWNER ACCEPTANCE PENDING. Changes are uncommitted.**

The owner directed accelerated sequential execution of the V1 mission and
explicitly instructed the agent to proceed while keeping merge, deletion and
commit actions gated on separate approval. The implementation gate in §10 was
therefore bypassed on owner instruction; the TASK-008A/B/C checklist was not
completed by the agent and no acceptance is claimed.

- Branch: `task/TASK-008D-creator-follow-graph-and-following-feed`
- Base: `586ab99`; docs tip before implementation: `add3374`
- Migration: `0003_lethal_red_ghost.sql`
- Isolated database: `br-steep-field-b3nti5ov` / `ancient-band-38052550`
- Production, `main`, auth, profile/avatar and unrelated repositories untouched

### What was built

- `follows(follower_identity_id, following_identity_id, created_at)` with the
  composite PK, `CHECK (follower <> following)` and both lookup indexes.
- `social-graph` repository/service/provider: session-derived actor,
  privacy-safe target lookup, idempotent follow/unfollow, indexed counts,
  30/min write limiter.
- `POST`/`DELETE /api/v1/profiles/[username]/follow` with same-origin checks and
  `no-store` responses.
- `GET /api/v1/feed?scope=following` plus `PostRepository.listFollowingFeed`
  (LEFT JOIN follows, own posts included, SQL visibility predicate retained).
- `FollowButton`, real profile follower/following counts, `/following` page,
  `FeedTabs`, `MemberFeed` scope, and profile loader follow state.
- 5 new test suites (38 tests) and `scripts/follows-live-check.mjs`.

### Gate evidence

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS — 39 files / 319 tests |
| `npm run build` | PASS |
| `npm run format:check` | PASS |
| `npm run secret-scan` | PASS — 286 files |
| `npm run check:boundaries` | PASS — 117 files |
| `npm run db:generate` | PASS — no drift |
| `npm run db:migrate` | PASS — isolated branch only |
| `node scripts/follows-live-check.mjs` | PASS — 18/18 |
| `npm run verify` | PASS — required gates; audit advisory unchanged |
| `npm run check:responsive` | NOT RUN — Chromium unavailable |

### Known limitations

- Changes are uncommitted by owner instruction; no merge, push or deploy was
  performed.
- Owner acceptance of TASK-008A/B/C and TASK-008D is still pending.
- Preview remains SSO-protected and was not agent-verified.
- Cloudinary credentials remain absent; live media upload is unproven.
- `check:responsive` is NOT RUN; owner phone verification at 360–412 px is
  required.
- Comments/post detail and notifications are outside TASK-008D and remain V1
  gaps requiring their own approved specs.

### Next action

Owner review of the uncommitted diff on the TASK-008D branch, then explicit
approval to commit/push if desired. Do not merge or deploy without separate
authorization.

## 20. Post-review corrections — 2026-11-16

Independent review verdict: no critical findings. Two scoped corrections were
requested and implemented; nothing else changed.

### 20.1 Unfollow a creator who became private

- `web/src/modules/social-graph/service.ts`: `resolveForMutation` takes
  `{ requirePublic }`. `follow` passes `true` (private ⇒ same `404`, no edge);
  `unfollow` passes `false` and then requires the caller's existing edge before
  deleting. Without an edge, unfollow returns the identical `404` body as an
  absent profile, so private profiles remain indistinguishable (no existence
  oracle).
- Actor is still `session.userId`; deletion is still filtered on both columns,
  so a caller can only remove their own edge. Idempotency is preserved: an
  existing edge is removed exactly once; the resolution path still rejects
  invalid handles and self-targets the same way.
- Response remains the three-field `FollowStateDto`; no visibility flag, profile
  data, identity id or auth subject is exposed. The profile page still returns
  `notFound()` for a private profile to non-owners.

Tests (`tests/social-graph-service.test.ts`):

- allows unfollowing a creator who became private when an edge exists;
- does not reveal a private profile via unfollow without an existing edge
  (byte-identical to the missing-profile `404`);
- still cannot follow a creator who is private.

Tests (`tests/follow-routes.test.ts`):

- allows unfollowing a creator who became private when an edge exists;
- answers private and missing targets identically on unfollow without an edge.

### 20.2 Deleted-post regression test

`tests/following-feed-route.test.ts`: "excludes soft-deleted posts from the
following feed" soft-deletes the followed creator's post and asserts the
Following feed omits it while still returning the viewer's own post.

### 20.3 Verification after corrections

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS — 39 files / 325 tests (+6) |
| `npm run build` | PASS |
| `npm run format:check` | PASS |
| `npm run secret-scan` | PASS — 286 files |
| `npm run check:boundaries` | PASS — 117 files |
| `npm run db:generate` | PASS — no drift, schema unchanged |
| `node scripts/follows-live-check.mjs` | PASS — 18/18 |
| `npm run check:responsive` | NOT RUN — Chromium unavailable |

Targeted run first: `npm test -- tests/social-graph-service.test.ts
tests/follow-routes.test.ts tests/following-feed-route.test.ts` → 35/35.

### 20.4 Boundaries respected

No database schema or migration change (migration `0003` and the isolated branch
are untouched), no follower-list endpoint, no follow requests, no authentication
or profile/avatar change, no comments/post-detail work. Nothing was committed,
merged, pushed or deployed.

### 20.5 Remaining owner acceptance checks

Unchanged from §10/§13: TASK-008A/B/C acceptance; two-account follow/unfollow and
count verification; Following-feed content/order; private-profile 404; the new
unfollow-while-private behaviour on a real device; responsive at 360/390/768 px;
Vercel Preview (SSO-blocked for the agent) and Cloudinary upload (credentials
absent).

## 21. Final audit findings M1/M2 — 2026-11-16

Supersedes §11 for the immediate next action. Task-file detail: §21 of
`task/TASK-008D-creator-follow-graph-and-following-feed.md`.

### 21.1 M2 — soft-delete regression test made genuine (RESOLVED)

- `tests/helpers/posts-double.ts`: `softDelete` now tombstones (`deletedAt` map)
  instead of splicing the row out; every read filters tombstoned rows, matching
  `isNull(posts.deletedAt)`; a repeated delete returns `false`.
- `tests/following-feed-route.test.ts`: asserts the row is retained with a
  timestamp, that the Following feed drops it while the viewer's own post
  remains, that the default feed drops it too, and a new test compiling the real
  query builder's WHERE clause (fake `Database`, no connection) asserts
  `"posts"."deleted_at" is null` plus the own-post and visibility clauses ship in
  the SQL.
- `tests/posts-service.test.ts`: one expectation encoded the old hard delete
  (`rows` length 0). It now asserts the row is retained with `deletedAt` set —
  the same claim, expressed against the real soft-delete shape. No other test
  was touched.

Controlled experiments, both fully reverted and verified afterwards:

| Experiment | Observed |
| --- | --- |
| Drop `notDeleted(record)` from the double's `listFollowingFeed` | behavioural test **FAILS** (`expected [...] not to include "A followed creator's post"`) |
| Drop `isNull(posts.deletedAt)` from `PostRepository.listFollowingFeed` | SQL test **FAILS** (`to contain '"posts"."deleted_at" is null'`) |
| Reverted | 9/9 in that file, 326/326 overall |

### 21.2 M1 — private-profile counts (BLOCKED: needs an owner contract decision)

An existing follower can still unfollow a creator who has since gone private, and
the `200` response still returns that private profile's `followerCount` and
`followingCount`. §9 forbids disclosing them; §7 forbids fabricating a value;
§10.2 fixes the success shape as `200` + `FollowStateDto`. Those three cannot all
hold, so **no code was changed** for M1. `AGENTS.md` requires stopping on
conflicting sources and the correction brief requires owner approval before any
DTO contract change.

Recommended fix (option A, ~6 lines in `service.ts` + type widening): make the
two count fields `number | null` and return `null` when the target is private.
JSON keys are unchanged, public-target responses stay byte-identical, no
external consumer exists yet, and only the private-unfollow response gains a new
possible value. Alternatives and their trade-offs: task file §21.2.

Tests for the private-profile response are deliberately not added: the shape is
undecided, so any test would either lock in the current leak or presume option A.
Once the owner picks a shape, add a service test (`unfollow` a now-private target
returns `isFollowing: false` with counts suppressed) and a route test (status,
`no-store`, body) next to the existing private-unfollow and 404-parity cases.

### 21.3 Verification (this round, final tree)

| Command | Result |
| --- | --- |
| `npm test -- tests/following-feed-route.test.ts` (targeted) | PASS — 9/9 |
| `npm test` | PASS — 39 files / **326 tests** (+1) |
| `npm run typecheck` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 |
| `npm run format:check` | PASS — exit 0 (after `prettier --write` on the three edited test files) |
| `npm run secret-scan` | PASS — exit 0 |
| `npm run check:boundaries` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 (`/following` still `ƒ` dynamic) |
| `npm run check:responsive` | NOT RUN — Chromium unavailable in this VM |

### 21.4 State

Branch `task/TASK-008D-creator-follow-graph-and-following-feed`, HEAD `add3374`,
0 behind / 2 ahead of `586ab99`. Everything above is **uncommitted**; nothing was
committed, merged, pushed or deployed, no schema or migration changed, and no
auth, profile/avatar or media module was touched.

Remaining owner action: pick a shape for M1 (recommendation: nullable counts).
Remaining acceptance checks are unchanged from §10/§13/§20.5.

## 22. M1 option A implemented — 2026-11-17

Owner approved nullable aggregate counts. Task-file detail: §22 of
`task/TASK-008D-creator-follow-graph-and-following-feed.md`. Still
**uncommitted** on `task/TASK-008D-creator-follow-graph-and-following-feed`
(HEAD `add3374`); nothing committed, merged, pushed or deployed, no schema or
migration change.

### 22.1 What changed

- `packages/domain/src/social-graph.ts` — `FollowStateDto.followerCount` and
  `.followingCount` are `number | null`; documented that `null` means "not
  visible to this viewer", never `0`. No runtime schema, so no serialiser change.
- `web/src/modules/social-graph/service.ts` — `unfollow` records
  `isPrivate = target.visibility !== "public"` before the existing-edge check and,
  after removing the caller's own edge, returns
  `{ isFollowing: false, followerCount: null, followingCount: null }` for a
  private target. Public targets still return `stateFor(...)` (real database
  counts). The existing-edge gate, the shared 404 and the ownership semantics are
  unchanged.
- `web/src/components/profile/MemberProfileView.tsx` — renders `?? "—"` so a
  suppressed count is never shown as `0`. Defensive only today: a private profile
  `404`s before this view renders.
- `tests/social-graph-service.test.ts`, `tests/follow-routes.test.ts` — the two
  private-unfollow tests now assert `null` counts (route test also keeps the
  `200`, removed edge and 404-parity checks). Public tests still assert exact
  numbers, so "suppressed" and "zero" are distinguishable.
- Task file and this handoff updated; `handoff/CURRENT_STATUS.md` updated.

Consumers of `FollowStateDto` audited: the domain type, the service, all three
route handlers in `web/src/app/api/v1/profiles/[username]/follow/route.ts` (plus
`getFollowState` consumers), `FollowButton` (reads `isFollowing` only), the
profile view (now null-safe) and the test double. No other consumer exists, and
no conversion of `null` to `0` exists anywhere.

### 22.2 M2 preserved

`tests/helpers/posts-double.ts` (tombstone `deletedAt` map, `notDeleted` filter)
and the `following-feed SQL` predicate guard are untouched from §21.1.

### 22.3 Verification

| Command | Result |
| --- | --- |
| `npm test -- tests/social-graph-service.test.ts tests/follow-routes.test.ts tests/follow-button.test.tsx` | PASS — 3 files / 32 tests |
| `npm test` | PASS — 39 files / 326 tests |
| `npm run typecheck` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 |
| `npm run format:check` | PASS — exit 0 |
| `npm run secret-scan` | PASS — exit 0 |
| `npm run check:boundaries` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 |
| `npm run check:responsive` | NOT RUN — no Chromium in this VM |

`npm ci` was required because the checkpoint restore dropped `node_modules`;
`package-lock.json` is unchanged and no manifest was edited.

### 22.4 Remaining concerns

- **API compatibility:** the JSON keys are unchanged, but `followerCount` /
  `followingCount` can now be `null` in exactly one case (unfollowing a target
  that became private). Any future client must treat `null` as "hidden", not
  missing and not `0`. Nothing consumes this API outside the web app today, and
  the branch is uncommitted/undeployed.
- **Not verified visually:** the `—` render path is unreachable through the
  normal profile route, so it is covered by types only, not by a UI test.
- Live Neon behaviour of the private-unfollow path is still only covered by
  `scripts/follows-live-check.mjs` for the public cases; the private-case response
  shape is unit/route-verified.
- Owner acceptance checks from §10/§13/§20.5 are unchanged.
