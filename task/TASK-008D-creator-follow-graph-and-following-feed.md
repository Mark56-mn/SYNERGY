# TASK-008D — Creator Follow Graph + Following Feed

Status: **IMPLEMENTED — OWNER ACCEPTANCE PENDING (2026-11-15)**

Approved: 2026-11-11. Task ID: **TASK-008D** (owner decision; existing TASK-009A provider/listings remains unchanged).

Requested name: **TASK-009A — Creator Follow Graph + Following Feed** (2026-11-11 mission).

Branch: `task/TASK-008D-creator-follow-graph-and-following-feed`

Base: `586ab99` (`task/TASK-008C-discover-and-explore` tip)

Database: isolated Neon branch `br-steep-field-b3nti5ov` only. **No migration has
been generated or applied.** Production, `main` and Vercel Production remain
untouched.

## 0. ID decision — resolved

On 2026-11-11 the owner approved **TASK-008D** as the task ID for this slice and
directed that the existing `task/TASK-009A-provider-profiles-and-listings.md`
remain unchanged. Do not rename, overwrite or merge that provider/listings task
into this specification.

The earlier collision is retained here as context: the 2026-11-11 mission
requested this slice as `TASK-009A`, but that identifier already belongs to
roadmap item 9. TASK-008D is the approved follow-graph slice under roadmap item
8.

Implementation remains blocked until the owner accepts TASK-008A/B/C. See the
owner-acceptance checklist in `handoff/TASK-008D.md` §10.

## 1. Goal

A signed-in member can follow and unfollow a public creator, see accurate
follower/following counts on that creator's profile, and read a chronological
Following feed containing posts from creators they follow. All graph mutations
are owner-scoped and all feed reads enforce profile visibility in SQL.

## 2. Source requirements and decisions

- `task/TASK-008-follow-graph-and-visibility.md` (roadmap item 8): follow/unfollow,
  profile/follow visibility, no leakage through feed/search/preview/API.
- `docs/adr/0003-authorisation-model-for-supabase-auth-with-neon.md`:
  service-layer deny-by-default authorisation, verified session identity,
  explicit ownership checks, parameterised access.
- `docs/adr/0009-identity-and-profile-threat-model-and-data-classification.md`:
  follow graph is personal data; follow/unfollow is owner-scoped; visibility is
  enforced at read time; private state must not become an enumeration oracle.
- `task/TASK-008A-main-social-feed.md`: posts, SQL visibility predicate,
  cursor-paginated feed, DTO allowlist, private-profile rules.
- `task/TASK-008C-discover-and-explore.md`: public creator suggestions and the
  explicit deferral of a follow action.
- `MASTER_BLUEPRINT.md`: chronological/following feed is a user control, not a
  ranking promise.

### 2.1 Approved product defaults

The owner approved these defaults on 2026-11-11. They are binding for TASK-008D:

1. **Simple accepted follows only.** Following a public creator creates the edge
   immediately. There are no follow requests, pending states, approvals,
   friends, close-friends or favourites in this slice.
2. **Private profiles cannot be followed.** A private or absent target returns
   the same `404` shape used by the profile route. There is no way to discover
   that a private handle exists or to queue a request for it. If a followed
   creator later changes to private, the edge is retained but contributes
   nothing to any feed; if they return to public, the existing edge applies
   again. This avoids destructive graph churn while preserving privacy.
3. **Visibility stays `public | private`.** TASK-008D does not add a
   `followers` profile or post visibility value. Follower-scoped profile/content
   visibility is a larger privacy-model change and is not implemented by a
   follow-button slice. The unused `contentVisibilitySchema` value `followers`
   in `packages/domain/src/content.ts` stays unused. The owner approved this
   boundary on 2026-11-11; follower-scoped visibility and private-profile follow
   requests remain future privacy-task work.
4. **Following feed is followed public creators plus the viewer's own posts.**
   This preserves the TASK-008A rule that a member can always see their own
   content in a feed. Posts by public creators the viewer does not follow are
   excluded. A stale follow edge to a now-private creator contributes nothing.
5. **Counts are aggregate, not a follower list.** A public profile shows
   `followers` and `following` counts. No endpoint in this slice returns the
   identities in either list. This is the minimum useful count without turning
   the graph into an enumeration surface.
6. **Discovery cards stay links in this slice.** A creator card opens
   `/u/<handle>`, where the follow action lives. Adding follow state to every
   search result and creator card is deferred so the discover payload does not
   gain a second module dependency.
7. **Private-profile follow requests are a future privacy task.** The owner has
   recorded that requests for private profiles may be considered later. They are
   not part of TASK-008D. Do not add a request state, an inbox or a
   private-profile follow path by implication.

## 3. Dependency and acceptance audit

### 3.1 TASK-008A/B/C

| Slice | Branch tip | Recorded state | Relevance |
| --- | --- | --- | --- |
| TASK-008A — Main social feed | `19c977a` | IMPLEMENTED — OWNER ACCEPTANCE PENDING; 30 files / 256 tests; live posts check 18/18 | Provides `posts`, `post_likes`, `post_topics`, feed API, visibility predicate, `MemberFeed`, `MemberPostCard`. |
| TASK-008B — Post creation studio | `b150db8` | IMPLEMENTED — OWNER ACCEPTANCE PENDING; 32 files / 268 tests | Provides `/compose` and photo upload. No follow dependency. Live Cloudinary upload remains unproven because credentials are absent. |
| TASK-008C — Discover & explore | `586ab99` | IMPLEMENTED — OWNER ACCEPTANCE PENDING; 34 files / 281 tests | Provides real search, creator suggestions and `/discover`. Explicitly has no follow action. Preview is behind Vercel SSO and was not agent-verified. |

Ancestry is linear: A is the base of B and B is the base of C. C therefore
contains A and B. TASK-008D must branch from `586ab99`, not from `main` or the
postponed TASK-007G5 branch.

**Acceptance caveat:** the three slices are not DONE by the repository's own
definition. Their recorded gates are green, but owner acceptance is pending.
Preparing this spec is allowed; implementation should not be reported as
accepted work until the owner explicitly accepts the stack or explicitly
authorises 008D on top of the unaccepted stack.

### 3.2 Existing code this slice builds on

- `web/src/modules/profile/schema.ts` — `profiles.identity_id`, unique username,
  `visibility public|private`.
- `web/src/modules/posts/{schema,repository,service,provider}.ts` — post model,
  feed cursor, SQL visibility predicate, DTO mapping.
- `web/src/app/api/v1/feed/route.ts` — `GET /api/v1/feed` with `limit`/`cursor`.
- `web/src/components/feed/MemberFeed.tsx` — server-rendered first page and
  cursor “Load more”.
- `web/src/components/profile/MemberProfileView.tsx` — currently renders a
  disabled reserved `Follow` action and a disabled `Message` action for
  non-owners; contains no follower counts.
- `web/src/app/u/[handle]/page.tsx` — profile loader with public/private and
  owner rules.
- `web/src/app/discover/page.tsx` and `DiscoverExplore` — public creator
  suggestions, no follow action.
- `packages/domain/src/content.ts` — `PostPageDto`, `PostViewDto`, cursor and
  page-size constants.
- `packages/domain/src/users-and-profiles.ts` — canonical username normalisation
  and validation.

## 4. Non-goals

- Follow requests, approvals, pending states, remove-follower controls.
- Followers/following list screens or APIs.
- Follower-scoped (`followers`) profile or post visibility.
- Notifications for new followers or followed creators' posts.
- Follow suggestions, “follow back”, mutuals, friends, close friends, favourites.
- Blocking, muting, restricting or reporting (TASK-011).
- Messaging or the reserved `Message` action.
- Ranking, personalisation, sponsored placement or algorithmic Following feed.
- Follow actions on discovery/search cards or post cards.
- Changes to authentication, session handling, Supabase Auth settings or cookies.
- Changes to the postponed profile/avatar rendering, white-screen debugging or
  photo-expansion/lightbox area.
- TASK-009A provider/listings and TASK-009B listing discovery.
- Android implementation; the shared contract must remain Android-safe.
- GitHub Actions/CI changes, unrelated repositories, or broad repository
  maintenance.

## 5. Acceptance criteria

1. `follows` exists as a reviewed additive migration on the isolated Neon branch;
   no Production or `main` write occurs.
2. A signed-in member with a profile can follow a public creator once. Repeating
   the request is idempotent and does not duplicate the edge or the count.
3. A signed-in member can unfollow; repeating the request is idempotent. Only the
   caller's own edge is removed.
4. Anonymous callers receive `401`; cross-origin mutations receive `403`;
   callers without a profile receive `403`; self-follow receives `400`.
5. Following an absent or private handle returns the same `404` shape as the
   profile route, creates no edge and reveals no private state.
6. A database `CHECK` rejects any self-edge even if a future service path
   regresses.
7. A public profile shows real `followers` and `following` counts and a Follow /
   Following control for a signed-in non-owner. A signed-out visitor gets a
   sign-in link, not an inert button.
8. A failed follow/unfollow leaves the displayed state and count unchanged and
   announces the failure with `role="alert"`; state changes only after the
   server confirms.
9. `GET /api/v1/feed?scope=following` requires a session and profile and returns
   only posts by followed public creators plus the viewer's own posts, newest
   first, cursor-paginated, `no-store`.
10. A public creator who is not followed, a private creator, a soft-deleted post
    and a stale follow to a now-private creator never appear in the Following
    feed.
11. The Following feed excludes all public posts when the viewer follows nobody;
    the empty state links to `/discover?tab=creators` or `/compose` honestly.
12. No auth subject, `identity_id`, internal profile id or follow-row id appears
    in any DTO, HTML payload, client bundle or log line.
13. Existing feed, profile, discover, compose and auth tests continue to pass.
14. `npm run verify`, `db:generate`, `db:migrate` (isolated branch only) and a
    live follow check pass, or any unavailable check is reported as not run
    rather than claimed.
15. Implementation does not begin until the owner records acceptance of
    TASK-008A/B/C and explicitly authorizes TASK-008D.

## 6. Database design

### 6.1 New table

New module: `web/src/modules/social-graph/`.

```sql
CREATE TABLE "follows" (
  "follower_identity_id" uuid NOT NULL,
  "following_identity_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "follows_follower_identity_id_following_identity_id_pk"
    PRIMARY KEY ("follower_identity_id", "following_identity_id"),
  CONSTRAINT "follows_no_self"
    CHECK ("follower_identity_id" <> "following_identity_id")
);

CREATE INDEX "follows_following_created_idx"
  ON "follows" ("following_identity_id", "created_at" DESC);

CREATE INDEX "follows_follower_created_idx"
  ON "follows" ("follower_identity_id", "created_at" DESC);
```

Design notes:

- The composite primary key is the database-level guarantee against duplicate
  follows and double counts.
- `follower_identity_id` is always the verified session subject. It is never
  accepted from a request body or query string.
- `following_identity_id` is the target profile's `identity_id`, resolved from a
  normalised public username. It is never accepted from the client.
- No cross-module foreign key is added to `profiles.identity_id`, matching the
  existing TASK-008A convention (posts also deliberately avoid cross-module
  FKs). The service refuses targets without a visible profile. Account deletion
  and orphan cleanup are a later erasure task; document that limitation rather
  than pretending cascades exist.
- `created_at` supports a future follower list in newest-first order. This slice
  does not expose that list.
- A profile that changes to private does not delete its follows. Every read path
  must join `profiles` and apply visibility, so a stale edge cannot leak content.
  If the owner prefers destructive cleanup, that is a separate approved change.

### 6.2 Migration

- Generate with `npm run db:generate`; review the SQL before committing.
- Expected migration name: `0003_*` (the exact generated suffix is not fixed in
  advance). The current journal ends at `0002_brown_santa_claus`.
- Apply only to the isolated branch after verifying `neon.branch_id` and
  `neon.project_id`, as TASK-007/008A did.
- Additive change. Forward recovery: dropping `follows` removes graph state and
  no posts/profiles; it is not an automated rollback. Do not run destructive SQL
  against Production.

### 6.3 Drizzle schema

`web/src/modules/social-graph/schema.ts` exports `follows` with:

- `uuid` columns for both identities;
- `timestamp(..., { withTimezone: true }).notNull().defaultNow()`;
- `primaryKey` on the pair;
- `check` for `follower <> following`;
- indexes matching the migration.

`web/src/modules/social-graph/index.ts` exports the read-only `follows` table
and row types for the posts module's feed JOIN. This mirrors the documented
`profile/index.ts` exception: only the owning module writes graph rows; the
posts module may read the table in the same SQL statement that enforces feed
visibility.

## 7. Domain contracts

Add `packages/domain/src/social-graph.ts` and export it from
`packages/domain/src/index.ts`.

```ts
export const FEED_SCOPE_DEFAULT = "for-you";
export const feedScopeSchema = z.enum(["for-you", "following"]);
export type FeedScope = z.infer<typeof feedScopeSchema>;

export interface FollowStateDto {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}
```

Rules:

- `FollowStateDto` is an explicit allowlist. No username, profile id, identity
  id, edge timestamp or auth subject.
- Counts are non-negative integers derived from the database; never fabricated
  or estimated.
- `feedScopeSchema` is used by the route/service boundary. An invalid value is a
  `400`, not a silent fallback to `for-you`.
- No new input schema is needed for the mutation bodies: follow/unfollow are
  path-addressed and body-less. Do not accept a follower or target id in a body.
- Keep the contract free of server/framework imports so Android can consume it.

## 8. Module design

### 8.1 `web/src/modules/social-graph/repository.ts`

Interface (names are indicative, shapes are the contract):

```ts
interface SocialGraphRepository {
  findTargetByUsername(username: string): Promise<{
    identityId: string;
    username: string;
    visibility: "public" | "private";
  } | null>;
  findProfileByIdentity(identityId: string): Promise<boolean>;
  isFollowing(input: {
    followerIdentityId: string;
    followingIdentityId: string;
  }): Promise<boolean>;
  follow(input: {
    followerIdentityId: string;
    followingIdentityId: string;
  }): Promise<void>; // insert ... on conflict do nothing
  unfollow(input: {
    followerIdentityId: string;
    followingIdentityId: string;
  }): Promise<void>; // delete only this pair
  countsFor(identityId: string): Promise<{
    followerCount: number;
    followingCount: number;
  }>;
}
```

Implementation rules:

- Every statement is parameterised through Drizzle.
- `follow` must use `onConflictDoNothing` on the composite key so a retry after
  a lost response cannot double-count.
- `unfollow` filters on **both** columns; there is no delete-by-target-only path.
- Count queries may be two aggregate statements or one statement with scalar
  subqueries. Do not load follower rows to count them.
- No repository method accepts an actor id from the caller as an authorization
  decision; the service supplies the verified subject.

### 8.2 `web/src/modules/social-graph/service.ts`

```ts
interface SocialGraphService {
  getFollowState(
    session: Session | null,
    username: string,
  ): Promise<FollowStateDto | null>;

  follow(session: Session | null, username: string): Promise<FollowStateDto>;

  unfollow(session: Session | null, username: string): Promise<FollowStateDto>;
}
```

`getFollowState`:

1. Normalise/validate the handle with `usernameInputSchema`. An invalid handle
   returns `null`, exactly like a missing profile.
2. Resolve the target. Return `null` if absent or if the viewer is not the owner
   and the profile is private.
3. Return `{ isFollowing, followerCount, followingCount }`. For the owner,
   `isFollowing` is always `false` (self-follow is impossible).

`follow` / `unfollow`:

1. `requireAuthenticatedUser(session)`; anonymous gets `401`.
2. Validate/normalise the handle. Invalid/absent/private target gets the same
   `404` (“Profile not found.”), whether or not the viewer is signed in.
3. Reject self-follow with `400` (“You cannot follow yourself.”).
4. Require the caller to have a profile; otherwise `403` (“Create your profile
   before following creators.”). This keeps the graph attributable and matches
   the publishing rule.
5. Insert/delete the edge for the verified subject only.
6. Re-read the state and return it. Both POST and DELETE are idempotent and
   return `200` after the first or any later call.

### 8.3 `web/src/modules/social-graph/provider.ts`

- Lazy composition root like the posts/profile providers: no database connection
  on import, so build/tests stay credential-free.
- `createFollowWriteLimiter()`: 30 requests/minute per actor; used by both POST
  and DELETE. Document that the in-memory limiter is per-process, not a
  production-grade shared control.

## 9. Authorization rules

| Operation | Anonymous | Signed in, no profile | Signed in with profile |
| --- | --- | --- | --- |
| Follow a public creator | 401 | 403 | allowed; own edge only |
| Follow a private/absent handle | 404 | 404 | 404; no edge |
| Follow yourself | 401 | 403 | 400 |
| Unfollow | 401 | 403 | allowed; removes only own edge |
| Read own profile state | n/a | n/a | allowed |
| Read another public profile state/counts | allowed aggregate counts, no identities | allowed | allowed |
| Read another private profile state | 404 at the profile route | 404 | 404 unless owner |
| `GET /api/v1/feed?scope=for-you` | allowed | allowed | allowed |
| `GET /api/v1/feed?scope=following` | 401 | 403 | allowed |

Additional rules:

- The actor is always `session.userId`. There is no caller-supplied follower id.
- The target is always resolved server-side from the path handle. There is no
  caller-supplied target identity id.
- `requireSameOrigin(request)` is mandatory on POST and DELETE.
- A mutation response is `no-store`.
- Counts are hidden with the profile: a private profile’s counts are visible
  only to its owner because the profile route is 404 to everyone else.
- No follower/following list endpoint exists, so there is no list-level
  authorization path to get wrong in this slice.
- Blocks/mutes do not exist yet; when TASK-011 lands it must suppress follows
  and feed reads consistently.

## 10. API contracts

### 10.1 `POST /api/v1/profiles/[username]/follow`

- Auth: required.
- CSRF: same-origin required.
- Body: none. Do not read identity fields from a body.
- Rate limit: 30/min per actor.
- Success: `200` with `FollowStateDto` and `cache-control: no-store`.
- Errors: `401`, `403`, `404` (absent/private), `400` (self), `429`, `500`.
- Idempotent: a second POST returns the same state and does not add a row.

### 10.2 `DELETE /api/v1/profiles/[username]/follow`

- Same auth, origin, rate limit and response shape as POST.
- Success: `200` with the post-delete state.
- Idempotent: deleting a non-existent edge is still `200`.
- A caller cannot delete another member's edge because the deleted pair always
  includes `session.userId`.

### 10.3 `GET /api/v1/feed?scope=following`

- `scope` is optional; missing or `for-you` preserves the existing feed exactly.
- `scope=following` requires a session (`401`) and a profile (`403`).
- `scope` with any other value returns `400`.
- `limit`/`cursor` keep the existing bounds and opaque cursor format.
- Response: existing `PostPageDto` (`posts`, `nextCursor`), `no-store`.
- No new feed DTO is introduced; clients cannot tell from the payload that it is
  a following page except by the posts themselves.

Optional convenience endpoint **not** in this slice:

- `GET /api/v1/profiles/[username]/followers|following` — excluded; returning
  identities is a privacy and enumeration decision for a later task.

## 11. Following-feed query

Extend `PostRepository` with:

```ts
listFollowingFeed(input: {
  viewerId: string;
  limit: number;
  cursor?: FeedCursor | null;
}): Promise<PostPage>;
```

Extend `PostsService.getFeed` with an optional `scope`:

```ts
getFeed(session, options?: {
  limit?: string | number | null;
  cursor?: string | null;
  scope?: FeedScope;
}): Promise<PostPageDto>;
```

Query shape:

- join `posts` to `profiles` for author fields and visibility;
- join `follows` on
  `follows.following_identity_id = posts.identity_id AND follows.follower_identity_id = :viewerId`;
- `posts.deleted_at IS NULL`;
- `(profiles.visibility = 'public' OR posts.identity_id = :viewerId)`;
- newest-first ordering and the existing `(createdAt, id)` cursor;
- return `PostRecord` rows through the existing `toPostView` map.

Notes:

- The own-post clause is intentional; self-follows are forbidden, so it is the
  only way a member’s own post enters the feed.
- A follow row alone never grants visibility. The profile visibility predicate is
  repeated in the SQL and the service re-filters defensively.
- Use the existing `posts_identity_created_idx` and the follow PK/follower index.
  At current scale no new posts index is required. If query plans later show a
  scan, add an index in its own reviewed migration, not in this slice.
- Counts are not part of the feed query.

## 12. UI behaviour

### 12.1 Profile follow control

New client component:
`web/src/components/profile/FollowButton.tsx`.

Props:

```ts
{
  username: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
  signedIn: boolean;
}
```

Behaviour:

- Signed out: render a link/button-link to
  `/login?next=%2Fu%2F<encoded-username>` labelled `Follow`. Never render a
  disabled-looking button that silently does nothing.
- Signed in, not following: `Follow` button.
- Signed in, following: `Following` button with `aria-pressed="true"` and an
  accessible label such as `Unfollow @ada_okoro`. Clicking it unfollows; no
  confirmation dialog is required for a reversible follow.
- While a request is in flight: disabled, with a text or `aria-busy` change;
  prevent double submits.
- Success: replace state with the server response; update the follower count
  from the response, not from a guessed increment.
- Failure: keep the previous state/count, show `role="alert"` with a safe
  message, and allow a retry. A `401` may offer a sign-in link.
- No optimistic update. The UI must not claim a follow succeeded before the
  server confirms.

### 12.2 Profile statistics and action row

In `MemberProfileView`:

- Add a compact `<dl>` for `Followers` and `Following` counts when a
  `FollowStateDto` is available. Use real values, including `0`; never invent a
  count. If the state query failed, omit counts and the Follow control rather
  than showing a false state.
- Replace only the reserved `Follow` action for a non-owner with `FollowButton`.
  Keep `Message` reserved and labelled as arriving later.
- Owner still sees `Edit profile`; owner counts are shown if loaded.
- Update the reserved-action hint copy so it no longer says Follow is arriving
  later. Keep the messaging hint.
- Preserve the existing layout, navy/mint tokens, `Avatar`, `Badge`, `Tabs` and
  accessibility patterns. Do not touch the avatar lightbox/photo-expansion
  implementation or the postponed TASK-007G5 area.

### 12.3 Following page

New route: `web/src/app/following/page.tsx`.

- `dynamic = "force-dynamic"` and metadata title `Following`.
- Anonymous: redirect to `/login?next=%2Ffollowing`, consistent with `/compose`.
- Signed in without a profile: render an honest empty/onboarding state with a
  link to profile creation; do not call the following feed and pretend it is
  empty because the member follows nobody.
- Signed in with a profile: load the first following page server-side and render
  `MemberFeed` with `scope="following"`.
- Database failure: render the existing “feed unavailable” state; never
  substitute demo posts.
- Empty: explain that the feed contains followed creators and offer links to
  `/discover?tab=creators` and `/compose`.

### 12.4 Feed tabs and pagination

- Add a small shared `FeedTabs` component (or the existing `Tabs` pattern if it
  can be link-based without changing its semantics) with `For you` → `/` and
  `Following` → `/following`. Mark the active tab with `aria-current="page"`.
- Home keeps the existing `For you` feed and gains the tab row.
- `MemberFeed` gets `scope?: "for-you" | "following"` and appends
  `scope=following` to its “Load more” request. It must not change the existing
  default requests.
- Heading/subtitle changes for the Following variant:
  “Following” / “Posts from creators you follow · newest first”.
- Post cards, likes, share and delete behaviour are unchanged. Deleting a post
  removes it from the list exactly as today.
- Do not add follow buttons to `MemberPostCard` or discovery cards.

### 12.5 Profile loader

In `web/src/app/u/[handle]/page.tsx`:

- After resolving the visible profile, load the follow state in parallel with the
  posts page.
- A state-load failure degrades to `followState = null`; the profile still
  renders, with no fabricated counts or Follow control.
- Do not change the auth/session mechanism, private-profile 404 behaviour or the
  existing DTO allowlists.
- Do not pass raw profile or follow rows across the server/client boundary; pass
  only `FollowStateDto` and existing profile DTOs.

## 13. Security and privacy review

- **IDOR/BOLA:** the actor is the verified session subject; the target is a
  public username. No request field can name a follower or target identity.
- **CSRF:** cookie-authenticated mutations require a same-origin `Origin`.
- **Enumeration:** private and absent targets share one `404` body. No
  followers/following list endpoint exists. Counts do not reveal identities.
- **Private content:** the following query joins `profiles` and enforces
  `public OR own`; a follow edge is not an entitlement to a private profile.
- **Stale edges:** retained when a creator goes private, but ignored by every
  read path; tests must cover this.
- **DTO allowlist:** `FollowStateDto` has three fields; tests must assert the
  exact key set and that the auth subject/identity id is absent from serialized
  responses.
- **Logging:** log counts/field names only; never log handles plus graph rows,
  request bodies or tokens.
- **Rate limiting:** follow writes 30/min per actor; existing feed limiter
  applies to following reads. In-memory limitations stay documented.
- **Personal data:** the graph is personal data. It is not exported, listed or
  used for recommendations in this slice. Account deletion/orphan cleanup is a
  documented later task.
- **No auth change:** no Supabase settings, session source, cookie or login flow
  change.

## 14. Test plan

### 14.1 Unit: social graph service

`tests/social-graph-service.test.ts` with an in-memory repository double:

1. Anonymous follow/unfollow → `401`, no edge.
2. Signed-in caller without a profile → `403`, no edge.
3. Follow creates exactly one edge for the verified caller.
4. Duplicate follow is idempotent and count stays 1.
5. Self-follow → `400`, no edge.
6. Missing target and private target return the same `404` shape.
7. Unfollow removes only the caller's edge; another member's edge survives.
8. Duplicate unfollow is `200` and does not throw.
9. Counts reflect edges, including zero, and contain no identities.
10. Invalid/malformed handle returns the same result as a missing profile.
11. `getFollowState` returns `null` for a private profile to a non-owner.
12. Owner state has `isFollowing: false`.

### 14.2 HTTP: follow routes

`tests/follow-routes.test.ts`:

1. POST/DELETE anonymous → `401`.
2. Cross-origin POST → `403`.
3. Follow success → `200`, `no-store`, exact `FollowStateDto` keys.
4. Duplicate POST → `200`, one row.
5. Self-follow → `400`.
6. Private/absent target → `404` with no edge.
7. DELETE removes only the caller's edge.
8. Rate limit → `429`.
9. Serialized response does not contain the auth subject or target identity id.
10. A body naming a follower or target is ignored/rejected and cannot change the
    actor or target (assert the resulting edge is still the session actor's).

### 14.3 HTTP: following feed

`tests/following-feed-route.test.ts`:

1. `scope=following` anonymous → `401`.
2. Signed in without a profile → `403`.
3. Invalid scope → `400`; missing/`for-you` preserves legacy behaviour.
4. Only followed public authors plus own posts are returned.
5. An unrelated public post is excluded.
6. A private author is excluded even when a follow row exists.
7. A soft-deleted post is excluded.
8. Cursor pagination preserves the following filter and ordering.
9. `no-store` and no identity/subject leakage.
10. A viewer who follows nobody gets an empty page (plus own posts if any).

### 14.4 UI

`tests/follow-button.test.tsx`:

1. Signed-out render is a login link, not an inert button.
2. Click follows, shows `Following`, updates count only after success.
3. Clicking `Following` unfollows.
4. Pending state disables the button and prevents a second request.
5. Failed request keeps state/count and shows an alert.
6. Accessible names and `aria-pressed` are correct.

`tests/following-feed-ui.test.tsx`:

1. Following page renders server-provided posts and tabs.
2. “Load more” calls `/api/v1/feed?scope=following&cursor=...`.
3. Empty state links to discover/compose.
4. Unavailable state does not show demo posts.
5. Home still calls the default feed URL.

Existing `tests/feed-ui`, `tests/profile-*`, `tests/discover-*` and auth suites
must remain green.

### 14.5 Live database check

New `scripts/follows-live-check.mjs`, run only against the isolated branch:

- verify target branch and project before writing;
- verify `follows` exists with PK/check/indexes;
- follow, duplicate follow, counts, unfollow, duplicate unfollow;
- self-follow rejected by the database check;
- private-target refusal and no edge;
- following-feed visibility with public/private posts;
- cleanup and assert zero test rows remain.

Report the exact pass count. Do not claim live success without it.

### 14.6 Gates

Run at implementation time:

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run secret-scan`
- `npm run check:boundaries`
- `npm run db:generate` (no drift after the generated migration)
- `npm run db:migrate` (isolated branch only)
- `node scripts/follows-live-check.mjs`
- `npm run check:responsive` — currently blocked in this VM by missing Chromium
  libraries; report NOT RUN and require owner phone verification at 360–412 px.

## 15. Implementation sequence after the acceptance gate

1. Confirm owner acceptance of TASK-008A/B/C and explicit authorization, then
   branch from `586ab99`.
2. Add `follows` schema and generate/review migration `0003`.
3. Apply to the isolated Neon branch after verifying target identity.
4. Add domain contracts and unit tests.
5. Add social-graph repository/service/provider and follow routes.
6. Add `listFollowingFeed`/`scope` to posts and feed tests.
7. Add `FollowButton`, profile stats/action-row integration and loader state.
8. Add `/following`, feed tabs and `MemberFeed` scope.
9. Add UI tests and the live check.
10. Run all gates, review the diff for privacy/scope, update task/handoff, and
    stop for owner acceptance.

## 16. Risks, blockers and conflicts

| Item | Impact | Resolution |
| --- | --- | --- |
| `TASK-009A` is already provider/listings | Resolved 2026-11-11 | Owner retained TASK-008D; TASK-009A provider/listings remains unchanged |
| TASK-008A/B/C owner acceptance pending | 008D would sit on unaccepted work | Owner approves the stack or explicitly authorises 008D on top |
| Follower-scoped visibility absent | TASK-008 “follow visibility” may be read more broadly | **Resolved:** owner approved binary `public/private`; follower-scoped visibility stays a future privacy task |
| Following feed includes own posts | Product semantics differ from “followed only” | **Resolved:** owner approved followed public creators plus the viewer's own posts |
| Postponed TASK-007G5 branch edits the profile area | Future merge conflict in `MemberProfileView`/avatar files | 008D does not depend on G5 and must not touch lightbox/avatar code; resolve conflicts only when G5 is resumed |
| Profile private→public edge retention | Stale graph rows remain | Reads filter visibility; tests cover it; account erasure/orphan cleanup deferred |
| No cross-module FK | Orphan follows possible after future profile deletion | Documented limitation; erasure task owns cleanup |
| In-memory rate limiter | Not shared across processes | Existing documented boundary; no production claim |
| Preview SSO and Cloudinary credentials | Cannot fully verify deployed/live media | Report as owner-blocked; do not fake |
| `check:responsive` unavailable | No automated viewport proof | Owner phone check at 360–412 px required |

No merge, no `main` change, no Production deployment and no authentication change
is authorised by this specification.

## 17. Forward recovery / rollback

- Code rollback: revert the 008D branch; `follows` can remain unused without
  affecting posts/profiles.
- Schema rollback: dropping `follows` is additive-reversible but destroys graph
  data; no automated destructive rollback is proposed.
- Visibility rollback: a creator switching back to private/public requires no
  graph mutation; the read predicate handles it.
- If the following feed is rejected after implementation, remove the scope route
  and page; the graph/table can remain for a later approved slice.

## 18. Approval record and implementation gate

Approved on 2026-11-11:

- [x] Task ID: **TASK-008D**. TASK-009A provider/listings remains unchanged.
- [x] Simple accepted follows only; no pending requests or approvals.
- [x] Private profiles cannot be followed; private and nonexistent profiles
  return the same `404`.
- [x] Visibility stays `public | private`; no `followers` value.
- [x] Following feed includes the viewer's own posts.
- [x] Counts only; no follower-list endpoints.
- [x] Discover creator cards remain links; no inline Follow buttons.
- [x] Base is `586ab99`; no G5/profile-avatar work is included.
- [x] Private-profile follow requests may be considered in a future privacy task;
  they are not silently added here.

**Implementation gate: CLOSED.** TASK-008A/B/C still require owner acceptance.
Complete the checklist in `handoff/TASK-008D.md` §10 and explicitly authorize
TASK-008D before creating the implementation branch, schema or migration.

**Stop here. Do not implement until the owner records acceptance of
TASK-008A/B/C and authorizes TASK-008D.**

## 19. Implementation record — 2026-11-15 (IMPLEMENTED — OWNER ACCEPTANCE PENDING)

The owner directed accelerated sequential execution of the V1 mission and
explicitly asked the agent to proceed, authorising implementation while keeping
merge, deletion and commit actions gated on separate approval. The work below
was completed on the existing TASK-008D branch and remains **uncommitted** in the
working tree at the owner's instruction.

- Branch: `task/TASK-008D-creator-follow-graph-and-following-feed`
- Base: `586ab99` (`task/TASK-008C-discover-and-explore` tip)
- Docs tip before implementation: `add3374`
- Migration: `0003_lethal_red_ghost.sql` (follows table, composite PK,
  self-follow CHECK, two lookup indexes)
- Isolated database: `br-steep-field-b3nti5ov` / project `ancient-band-38052550`
- Production, `main`, authentication, profile/avatar and unrelated repositories
  were not changed.

### Delivered

| Area | Files |
| --- | --- |
| Domain | `packages/domain/src/social-graph.ts`, `packages/domain/src/index.ts` |
| Schema | `web/src/modules/social-graph/{schema,index}.ts` |
| Service/API | `web/src/modules/social-graph/{repository,service,provider}.ts`, `web/src/app/api/v1/profiles/[username]/follow/route.ts` |
| Feed | `web/src/modules/posts/{repository,service}.ts`, `web/src/app/api/v1/feed/route.ts` |
| UI | `web/src/components/profile/FollowButton.tsx`, `MemberProfileView.tsx`, `web/src/app/u/[handle]/page.tsx`, `web/src/app/following/page.tsx`, `web/src/components/feed/FeedTabs.tsx`, `MemberFeed.tsx`, `web/src/app/page.tsx` |
| Migration | `db/migrations/0003_lethal_red_ghost.sql` + journal/snapshot |
| Tests | `tests/social-graph-service.test.ts`, `follow-routes.test.ts`, `following-feed-route.test.ts`, `follow-button.test.tsx`, `following-feed-ui.test.tsx`, helper doubles |
| Live check | `scripts/follows-live-check.mjs` |

### Verified commands

- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm test` — PASS (39 files / 319 tests, +38 new)
- `npm run build` — PASS
- `npm run format:check` — PASS
- `npm run secret-scan` — PASS (286 files)
- `npm run check:boundaries` — PASS (117 files)
- `npm run db:generate` — PASS (no drift after `0003`)
- `npm run db:migrate` — PASS (isolated branch only)
- `node scripts/follows-live-check.mjs` — PASS (18/18)
- `npm run verify` — PASS (required gates; audit advisory unchanged)
- `npm run check:responsive` — NOT RUN (Chromium libraries unavailable in the
  VM); owner phone verification at 360–412 px remains required.

### Limitations

- Changes are uncommitted by owner instruction.
- Vercel Preview remains SSO-protected and was not agent-verified; Cloudinary
  credentials remain absent, so live media upload is still unproven.
- Private-profile follow requests remain a future privacy task.
- Comments/post-detail and notifications are **not** part of TASK-008D; they
  remain V1 gaps and require their own approved task specs.

## 20. Post-review corrections — 2026-11-16 (IMPLEMENTED — OWNER ACCEPTANCE PENDING)

The independent review found no critical issues and requested two narrowly scoped
corrections. Both are implemented; no other reviewed behaviour changed.

### Correction 1 — unfollow a creator who became private

`resolveForMutation` now takes an explicit `requirePublic` option.

- **Follow** keeps `requirePublic: true`: a private target is still an identical
  `404` and never creates an edge.
- **Unfollow** uses `requirePublic: false`, then requires the caller's own edge
  to already exist before removing it. No edge means the same `404` body as an
  absent profile, so a private account is not an existence oracle.
- The viewer is always `session.userId`; the delete is still filtered on both
  columns, so only the caller's edge can be removed.
- The response remains the three-field `FollowStateDto`; no visibility flag,
  identity id or private profile data is returned. A private target's counts are
  the public counts of its retained edges, which the spec already permits; the
  profile page itself still 404s for non-owners.

Tests added: service "allows unfollowing a creator who became private when an
edge exists", "does not reveal a private profile via unfollow without an existing
edge", "still cannot follow a creator who is private"; route "allows unfollowing
a creator who became private when an edge exists" and "answers private and
missing targets identically on unfollow without an edge".

### Correction 2 — deleted-post regression test

`tests/following-feed-route.test.ts` gains "excludes soft-deleted posts from the
following feed": the followed creator's post is soft-deleted, then
`GET /api/v1/feed?scope=following` must omit it while still returning the
viewer's own post.

### Gates after the corrections

- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm test` — PASS (39 files / 325 tests; +6)
- `npm run build` — PASS
- `npm run format:check` — PASS
- `npm run secret-scan` — PASS (286 files)
- `npm run check:boundaries` — PASS (117 files)
- `npm run db:generate` — PASS (no drift; schema unchanged)
- `node scripts/follows-live-check.mjs` — PASS (18/18)
- `npm run check:responsive` — NOT RUN (Chromium unavailable)

No schema, migration, auth, profile/avatar, follower-list, follow-request or
comments/post-detail change was made. Nothing was committed, merged, pushed or
deployed.

## 21. Final audit findings — 2026-11-16

The acceptance-readiness audit raised two findings. **M2 is resolved. M1 needs one
owner contract decision and was deliberately not changed in code**, because every
way to suppress the counts alters a documented contract and the specification is
in conflict with itself for this case (§21.2).

### 21.1 M2 — the soft-delete regression test is now genuine (RESOLVED)

The earlier test passed vacuously: the in-memory repository's `softDelete`
spliced the row out of its array, so a deletion assertion could not fail even if
the deletion predicate disappeared.

Changes:

- `tests/helpers/posts-double.ts` now models `posts.deleted_at` as a tombstone:
  `softDelete` records the moment in a `deletedAt` map and **keeps the row**,
  returning `false` for an unknown author or an already-deleted post, mirroring
  `update ... where id = $1 and identity_id = $2 and deleted_at is null`.
- Every read in the double excludes tombstoned rows (`listFeed`,
  `listByUsername`, `listFollowingFeed`, `findByIdForViewer`, `search`,
  `trendingTopics`, `suggestedCreators` post counts), matching
  `isNull(posts.deletedAt)` in the real queries.
- `tests/following-feed-route.test.ts` asserts the row is retained with a
  `deletedAt` timestamp, that the Following feed omits it while the viewer's own
  post remains, and that the default feed omits it too.
- A new test compiles the **real** query builder's WHERE clause with
  `PgDialect.sqlToQuery` against a capturing fake `Database` (no connection) and
  asserts the shipped SQL contains `"posts"."deleted_at" is null`, the own-post
  clause and the visibility clause. The in-memory double cannot see SQL, so this
  is the only check that fails when the production predicate is removed.

Controlled experiments (both fully reverted, working tree verified identical
afterwards):

| Experiment | Expected | Observed |
| --- | --- | --- |
| Remove `notDeleted(record)` from the double's `listFollowingFeed` | behavioural test fails | **FAIL** — `expected [... 'A followed creator's post'] not to include ...` |
| Remove `isNull(posts.deletedAt)` from `PostRepository.listFollowingFeed` | SQL test fails | **FAIL** — `expected '("posts"."identity_id" = $1 or ...' to contain '"posts"."deleted_at" is null'` |
| Both reverted | green | 9/9 in `tests/following-feed-route.test.ts` |

### 21.2 M1 — private-profile aggregate counts (BLOCKED: contract decision)

Current behaviour: an existing follower may unfollow a creator who has since
become private (approved correction 1), and the `200` response still carries that
private profile's `followerCount` and `followingCount`.

The specification cannot be satisfied as written:

- §7 — "Counts are non-negative integers derived from the database; never
  fabricated or estimated."
- §9 — "Counts are hidden with the profile: a private profile's counts are
  visible only to its owner because the profile route is 404 to everyone else."
- §10.2 — successful `DELETE` returns "`200` with the post-delete state".

Suppressing the counts therefore requires either a fabricated value (forbidden by
§7 and by the correction brief) or a change to the response contract (§10.2).
Per `AGENTS.md` ("If sources conflict, stop work on the affected requirement,
document the conflict and propose a resolution. Do not silently choose.") and the
correction brief itself ("If this requires changing the DTO contract, document
the compatibility implications and stop for owner approval"), **no code was
changed for M1**.

Options, smallest first:

| Option | Shape | Compatibility implications | Verdict |
| --- | --- | --- | --- |
| **A. Nullable counts** (recommended) | `followerCount: number \| null`, `followingCount: number \| null`; `null` = "not visible to you" | JSON keys unchanged; one new possible value in one case (private-target success). TS type widens, so `MemberProfileView` renders counts only when numeric (never null today, because a private profile 404s before the profile view). No external consumer: the Android app has no follow client and the branch is uncommitted/undeployed. Public-target responses are byte-identical | Smallest honest change; needs owner approval |
| B. Omit counts for private targets | Optional fields or a second response variant | Shape change: clients must tolerate missing keys; a permissive consumer could read `undefined` as 0 | Rejected — worse than A |
| C. `204 No Content` for a private-target success | No body | Two success shapes (`200` JSON / `204`); contradicts §10.2; client must branch on status | Rejected — largest behaviour change |

Tests deferred: a test can only lock a decided shape, and adding one now would
either encode the current leak as expected behaviour or guess at option A. The
preserved behaviours stay covered: private-target unfollow succeeds with an
existing edge, private and missing targets stay byte-identical without an edge,
public unfollow is unchanged, and no edge is created by a follow to a private
account.

If the owner approves option A, the change is: widen the two fields in
`FollowStateDto`, return `null` for them in `SocialGraphService.unfollow` when
the resolved target is private, update the expectation in
`tests/social-graph-service.test.ts` ("allows unfollowing a creator who became
private when an edge exists", currently `{ isFollowing: false, followerCount: 0,
followingCount: 0 }` — note the target's real counts are asserted as `0` there,
so that test does not distinguish a suppressed count from a leaked one), and add
a route assertion on the private-unfollow body next to
`tests/follow-routes.test.ts` "allows unfollowing a creator who became private
when an edge exists".

## 22. M1 option A approved and implemented — 2026-11-17

The owner approved **option A**: nullable aggregate counts. §7's "counts are
non-negative integers … never fabricated" and §9's "a private profile's counts
are visible only to its owner" now coexist because "not visible to you" has its
own representation (`null`) instead of a fabricated `0`.

### 22.1 Contract

```ts
export interface FollowStateDto {
  isFollowing: boolean;
  followerCount: number | null; // null = not visible to this viewer
  followingCount: number | null; // null = not visible to this viewer
}
```

`schema`/migration untouched; `follows` counts are still read from the database.

### 22.2 Behaviour

| Case | Response |
| --- | --- |
| Follow a public profile | `200`, real database counts |
| Unfollow a public profile | `200`, real database counts |
| Unfollow a creator who since became private, with an existing edge | `200`, `isFollowing: false`, both counts `null`; only that edge is removed |
| Follow a private profile | `404` (unchanged) |
| Unfollow a private profile without a viewer-owned edge | `404`, byte-identical to a nonexistent handle (unchanged) |
| `GET` follow state of a private profile for a non-owner | `null` state → the profile route `404`s (unchanged) |

Authorization, ownership, origin check, rate limit (`30/min`, keyed
`user:<id>`), `no-store` and idempotency (`on conflict do nothing`, delete of the
exact pair) are untouched.

### 22.3 Consumers of `FollowStateDto` audited

| Consumer | Handling |
| --- | --- |
| `packages/domain/src/social-graph.ts` | Type widened; no runtime schema, so no serialiser change |
| `web/src/modules/social-graph/service.ts` | Returns `null` counts only for the private-target unfollow; `stateFor` still returns database numbers |
| `web/src/app/api/v1/profiles/[username]/follow/route.ts` | Passes the DTO straight to `Response.json` — no coercion, `null` reaches the wire |
| `web/src/components/profile/FollowButton.tsx` | Only reads `isFollowing`; forwards the DTO to `onConfirmed` |
| `web/src/components/profile/MemberProfileView.tsx` | `{count ?? "—"}` — a suppressed count renders as an em dash, never as `0`. (Unreachable today: a private profile 404s before this view renders, so the `null` path is defensive) |
| `tests/helpers/social-graph-double.ts`, tests | Fixtures stay numeric for public targets; the private cases assert `null` |

### 22.4 Tests updated

- `tests/social-graph-service.test.ts` — "allows unfollowing a creator who became
  private when an edge exists" now asserts
  `{ isFollowing: false, followerCount: null, followingCount: null }`. Public
  cases still assert exact numbers, so the tests distinguish "suppressed" from
  "zero".
- `tests/follow-routes.test.ts` — the matching route test now asserts
  `body.followerCount` and `body.followingCount` are `null`, keeping the `200`,
  the removed edge and the untouched 404 parity checks.
- No new file was added; the assertions live in the tests that already own the
  private-unfollow behaviour.

### 22.5 M2 preserved

`tests/helpers/posts-double.ts` tombstone model and the
`following-feed SQL` predicate guard are unchanged from §21.1.

### 22.6 Verification

| Command | Result |
| --- | --- |
| `npm test -- tests/social-graph-service.test.ts tests/follow-routes.test.ts tests/follow-button.test.tsx` | PASS — 3 files / 32 tests |
| `npm test` | PASS — 39 files / 326 tests |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run format:check` | PASS |
| `npm run secret-scan` | PASS |
| `npm run check:boundaries` | PASS |
| `npm run build` | PASS |
| `npm run check:responsive` | NOT RUN — no Chromium in this VM |

`npm ci` was needed because the checkpoint restore dropped `node_modules`;
`package-lock.json` is unchanged.
