# TASK-008A — Main social feed — handoff

- **Status:** IMPLEMENTED — OWNER ACCEPTANCE PENDING
- **Branch:** `task/TASK-008A-main-social-feed`
- **Base:** `1660700f0a3e15c226e778e82671e39011a1eb0f`
- **Database:** Neon project `ancient-band-38052550`, branch
  `br-steep-field-b3nti5ov`, `neondb`, PostgreSQL 18.6. Branch identity verified
  (`neon.branch_id`) before migrating; 0 test rows left behind.
- **`main` / Production:** untouched. No deployment, no promotion.

## 1. What changed

New module `web/src/modules/posts/`:
- `schema.ts` — `posts` (caption + optional single photo, soft delete),
  `post_likes` (composite PK per member/post), `post_topics` (derived hashtags).
- `repository.ts` — Drizzle queries. The entitlement predicate
  (`profiles.visibility = 'public' OR posts.identity_id = viewer`) is part of
  every feed/author/search/topic query, so private authors cannot leak through
  pagination or counts. `escapeLikePattern` keeps `%`/`_` literal in search.
- `service.ts` — verified-session authorship, strict schemas, profile-required
  publishing, Cloudinary-folder media policy, cursor encode/decode, DTO
  allowlist.
- `provider.ts` — lazy service + rate limiters (feed 120/min, publish 10/min,
  like 60/min).

Routes: `GET /api/v1/feed`; `POST /api/v1/posts`; `DELETE /api/v1/posts/[id]`;
`POST|DELETE /api/v1/posts/[id]/like`.

Domain: `packages/domain/src/content.ts` gained post bounds, `extractTopics`,
`PostViewDto`/`PostPageDto`/`CreatorSuggestionDto`/`TrendingTopicDto` and
`formatPostTime` (shared with TASK-008C).

Shared: `web/src/modules/profile/index.ts` exports the read-only `profiles`
table for the feed JOIN; `web/src/server/media/cloudinary.ts` verifies
Cloudinary folder URLs; `web/src/server/http/handler.ts` now passes dynamic
route `params` to handlers.

UI: `web/src/components/feed/MemberFeed.tsx`, `MemberPostCard.tsx`; home page
uses them; `FeedStream.tsx` (demo feed) removed. `MemberProfileView` renders
real posts (Posts/Media tabs). Shell disclosure copy corrected.

Migrations: `db/migrations/0001_real_moira_mactaggert.sql`,
`0002_brown_santa_claus.sql` — both applied to the isolated branch only.

## 2. Interaction honesty

- Like: persisted; signed-out visitors see “Sign in to like” (a link), not an
  inert button.
- Share: native share sheet when available, otherwise clipboard; the message
  reflects what actually happened.
- Comment: disabled, labelled as arriving with a later task.
- Delete: owner-only, confirmation, removed only after the server confirms.
- A failed like/delete shows an error and leaves the stored state unchanged.

## 3. Test evidence

| Check | Result |
| --- | --- |
| `npm run verify` | see §5 |
| `node scripts/posts-live-check.mjs` | **18/18** |
| Focused suites | `posts-service` 18, `posts-routes` 12, `feed-ui` 7 |
| `npm run db:generate` | no drift after 0002 |
| `npm run db:migrate` | applied on `br-steep-field-b3nti5ov` only |

## 4. Security / privacy review

- Author identity comes only from the verified session; create schema is strict,
  so `identityId`/`authorId` in a body is a 400.
- Private-profile posts and their likes/topics are filtered in SQL for every
  non-owner; search and topic discovery repeat the same predicate.
- Deletion and likes answer 404 for invisible/foreign posts — no existence
  oracle.
- DTOs contain no auth subject, internal id or visibility flag; tests assert the
  exact key set and that the subject does not appear in serialised output.
- Media URLs must be `https:` and, when Cloudinary is configured, inside the
  `synergy/posts` folder.
- Logs record counts and field names only; no captions, tokens or rows.

## 5. Gate results

Recorded after `npm run format`:

- `npm run format:check` — PASS
- `npm run lint` — PASS
- `npm run typecheck` — PASS (web + Android)
- `npm test` — PASS (30 files / 256 tests)
- `npm run build` — PASS (feed and posts routes present)
- `npm run secret-scan` — PASS
- `npm run check:boundaries` — PASS
- `npm run verify` — PASS with the known audit advisory (19 vulnerabilities,
  unchanged from B-5)
- `npm run check:responsive` — **NOT RUN** (Playwright unavailable in this
  environment)

## 6. Next

- TASK-008B (composer + post-photo upload) builds on this branch.
- Owner acceptance: sign in, publish a text post, like another member's post,
  delete your own, and confirm a private-profile member's posts are invisible to
  a second account.
