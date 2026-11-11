# TASK-008D — Creator Follow Graph + Following Feed — handoff

- **Status:** SPEC READY — AWAITING OWNER APPROVAL; **no implementation**
- **Requested name:** TASK-009A — Creator Follow Graph + Following Feed
- **Provisional repository ID:** TASK-008D (because TASK-009A is already
  `task/TASK-009A-provider-profiles-and-listings.md`)
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

## 3. Key design decisions (pending approval)

1. **Task ID:** keep this slice as TASK-008D or explicitly reassign TASK-009A and
   renumber the existing provider/listings task. Do not overwrite the existing
   `task/TASK-009A-provider-profiles-and-listings.md`.
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

1. **TASK-009A ID collision (P0 before implementation).** Existing provider/
   listings task owns 009A. This spec is provisional 008D. Owner must confirm.
2. **Owner acceptance of 008A/B/C still pending.** Do not report 008D as accepted
   on top of unaccepted work without explicit authorisation.
3. **Follower-scoped visibility ambiguity.** TASK-008's “follow visibility” could
   mean `followers` profile/post visibility. This spec deliberately keeps binary
   `public|private`; if that is wrong, expand and re-approve before coding.
4. **Following feed includes own posts.** Product default; easy to change before
   implementation.
5. **TASK-007G5 profile/avatar branch is postponed and separate.** It edits the
   same profile component area and avatar lightbox. Do not rebase 008D onto it or
   modify those files. Resolve conflicts only when G5 resumes.
6. **Preview/SSO and Cloudinary credentials remain owner-blocked.** No agent
   claim of deployed/upload verification.
7. **`check:responsive` cannot run here.** Owner phone check required.
8. **No cross-module FK / account erasure.** Orphans possible only if a future
   deletion path lands; document and clean up there.
9. **In-memory limiter is per-process.** Existing documented boundary.

## 10. Next action

**Stop and wait for owner approval.** Do not create the implementation branch,
write schema, run migrations, modify source, merge anything, or touch `main` /
Production / auth / the profile-avatar debugging area.

After approval:

1. Confirm task ID and branch from `586ab99`.
2. Implement in the order in the specification §15.
3. Update `handoff/CURRENT_STATUS.md` and this handoff with real gate evidence.
4. If implementation is authorised, stop again at owner acceptance; do not merge.

## 11. Handoff completeness

A new agent should be able to resume from this file plus the specification
without repeating discovery. The unresolved items are deliberate approval gates,
not missing context: task ID, binary visibility, own-post inclusion, acceptance
of 008A/B/C, and the postponed profile/avatar branch.
