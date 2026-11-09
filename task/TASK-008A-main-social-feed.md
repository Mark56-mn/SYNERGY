# TASK-008A — Main social feed

Status: **IMPLEMENTED — OWNER ACCEPTANCE PENDING**
Branch: `task/TASK-008A-main-social-feed`
Base: `1660700f0a3e15c226e778e82671e39011a1eb0f` (TASK-007B tip)
Database: isolated Neon branch `br-steep-field-b3nti5ov` (project `ancient-band-38052550`, `neondb`) — verified via `neon.branch_id` before every write.

## 1. Goal

A signed-in member can publish a text/image post and everyone can read a real,
newest-first feed whose visibility rules are enforced in SQL. Post cards expose
honest interaction interfaces: persisted likes, native share, a clearly
unavailable comment action, owner delete.

## 2. Non-goals

- Ranking, personalisation, sponsored placement, or a following feed (the
  follow graph is TASK-008).
- Comments, reposts, notifications.
- Video/media pipeline; galleries; multiple images per post.
- Moderation/reporting (TASK-011).

## 3. Acceptance criteria

- `posts`, `post_likes` and `post_topics` exist as reviewed migrations on the
  isolated branch.
- `POST /api/v1/posts` publishes as the verified session subject only; a
  body-supplied author is rejected; a member without a profile cannot publish.
- `GET /api/v1/feed` returns public posts plus the caller's own, newest first,
  cursor-paginated, `no-store`.
- A private profile's posts are never selected for anyone but their owner.
- Likes are persisted once per member/post and are reversible.
- The owner can soft-delete their post; another member receives 404.
- Feed UI has loading, empty, error, success and disabled states; signed-out
  visitors get sign-in affordances instead of controls that silently fail.
- No auth subject, internal id or visibility flag appears in any DTO, HTML
  payload or client bundle.

## 4. Implementation

- `packages/domain/src/content.ts` — post contracts: caption bounds, https media
  URL, `extractTopics` (URL-aware `#hashtag` parsing), `PostViewDto`,
  `formatPostTime`.
- `web/src/modules/posts/schema.ts` — `posts`, `post_likes`, `post_topics` with
  CHECK constraints (trimmed caption 1–1000, https-only media, topic shape) and
  indexes for feed, author timeline and topic discovery.
- `web/src/modules/posts/repository.ts` — Drizzle persistence. Every read joins
  `profiles` and applies `deleted_at is null AND (author public OR author is the
  viewer)` in SQL; likes/topics are hydrated in batched queries.
- `web/src/modules/posts/service.ts` — authorization, strict validation,
  Cloudinary-folder media policy when the adapter is enabled, cursor
  encode/decode, defensive re-filtering, DTO allowlist.
- `web/src/modules/posts/provider.ts` — lazy composition root + read/write/like
  rate limiters.
- Routes: `GET /api/v1/feed`, `POST /api/v1/posts`, `DELETE /api/v1/posts/[id]`,
  `POST|DELETE /api/v1/posts/[id]/like`. Same-origin required on mutations.
- `web/src/server/http/handler.ts` — wrapped routes now pass validated dynamic
  route `params` to handlers (additive; existing routes unaffected).
- UI: `MemberFeed` (server-rendered first page + cursor "Load more") and
  `MemberPostCard` (persisted like, native share/clipboard with real outcomes,
  disabled comment with explanation, owner delete with confirmation).
- Home page renders the real feed; `FeedStream` demonstration feed removed.
  Member profiles now show real posts and post photos in their Posts/Media tabs.
- Demo `PostCard` and demo profile/community surfaces are unchanged.
- Shell disclosure copy updated: demo items stay labelled; member posts are
  stored in the project's development database.

## 5. Migrations

- `0001_real_moira_mactaggert.sql` — posts, post_likes, post_topics.
- `0002_brown_santa_claus.sql` — tightens the caption CHECK to reject
  whitespace-only bodies (found by the live check).

Applied only to the isolated branch. Forward recovery: both migrations are
additive; dropping the three tables reverses the slice (engagement and posts
would be lost, so no destructive rollback is automated).

## 6. Tests and evidence

- `tests/posts-service.test.ts` (18), `tests/posts-routes.test.ts` (12),
  `tests/feed-ui.test.tsx` (7) with in-memory repository doubles.
- `scripts/posts-live-check.mjs` — **18/18** live Neon checks: target branch,
  tables, publish, anonymous/other/owner visibility, like uniqueness, search and
  topic visibility, constraint rejection, soft delete, cleanup.
- Full repository gates recorded in `handoff/TASK-008A.md` §5.

## 7. Known limitations

- The feed is chronological, not ranked; there is no follow graph yet.
- Comments are not implemented and are labelled as such.
- Post photos can only be attached once the composer/upload endpoint lands in
  TASK-008B; until then the API accepts a verified Cloudinary URL only.
- In-memory rate limiting is per process (documented boundary), not a
  production-grade shared limiter.
- Owner Android acceptance and Preview deployment remain owner actions.
