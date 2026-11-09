# TASK-008C — Discover & Explore

Status: **IMPLEMENTED — OWNER ACCEPTANCE PENDING**
Branch: `task/TASK-008C-discover-and-explore`
Base: `b150db8` (TASK-008B tip)
Database: isolated Neon branch `br-steep-field-b3nti5ov` (no schema change).

## 1. Goal

A member or visitor can search real posts and people, see what is trending,
filter by topic and find creators to follow — with results that are real,
bounded and clearly separated from the fictional demonstration directory.

## 2. Non-goals

- Full-text ranking, fuzzy typo tolerance or saved searches.
- Following a creator (no follow table yet), notifications, personalised ranking.
- Real communities/businesses/products directories (still demonstration data).

## 3. Acceptance criteria

- `/discover` renders server-side results, so posts appear without JavaScript.
- Search matches captions, author display names, usernames and `#topics`;
  `%`/`_` in input are literal, and input is capped at 80 characters.
- Tabs: Posts, Creators, Topics, each with a live count.
- Trending topics (last 30 days, public posts only) act as category filters;
  selecting one narrows results and mark the chip pressed; selecting again
  clears it. `?topic=` links from post cards land filtered.
- Suggested creators list public profiles only, excluding the viewer, with
  their post counts and a link to `/u/<handle>`.
- Private profiles are absent from search, suggestions and trending counts;
  a private author still finds their own matching posts.
- Searching shows an in-flight state and replaces results only after the server
  answers (HTTP 200). Failure keeps the previous results and says they were not
  updated. Empty results state what was searched and offer a way back.
- The URL is updated (`?q=`, `?topic=`) so a search can be shared and reloaded.
- The fictional demonstration directory remains below a separate heading and is
  never mixed into real results; legacy `/discover?tab=videos` links still work.

## 4. Implementation

- `web/src/app/api/v1/discover/route.ts` — `GET` returning `DiscoverResultDto`
  (`query`, `topic`, `posts`, `creators`, `topics`); strict topic validation,
  80-character query cap, `no-store`, 60 requests/minute per caller.
- `web/src/components/discovery/DiscoverExplore.tsx` — search form, trending
  chips, tabs, post list reusing `MemberPostCard`, creator cards, honest
  loading/empty/error/unavailable states, shareable URL updates.
- `web/src/app/discover/page.tsx` — server render of the initial results with
  the session, plus the labelled demonstration directory.
- `web/src/modules/posts/{repository,service,provider}.ts` —
  `suggestedCreators` accepts a creator search term (ILIKE on username/display
  name, LIKE-escaped); discover read limiter added.
- `packages/domain/src/content.ts` — `DiscoverResultDto`.

## 5. Tests

- `tests/discover-route.test.ts` (6) — anonymous search, private-author
  isolation (both directions), topic + combined query, invalid topic 400,
  public-only creator suggestions, rate limit, no-store and no auth subject in
  the payload.
- `tests/discover-ui.test.tsx` (7) — server-provided render, API search +
  URL update, topic chip filter, failed search keeps previous results, empty
  state, creators tab, unavailable state.
- Full gate results in `handoff/TASK-008C.md` §5.

## 6. Limitations

- Search is `ILIKE '%term%'` (no index-backed full-text ranking); fine at the
  current data size, revisit with a trigram/full-text index at scale.
- Trending counts include only the last 30 days of public posts.
- No creator follow action: following needs a backend table and is labelled as
  a later task.
- Mobile layout was not visually verified here (`check:responsive` cannot run
  without Playwright); verify on a 360 px device before acceptance.
