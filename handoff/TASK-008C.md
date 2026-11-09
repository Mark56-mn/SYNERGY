# TASK-008C — Discover & Explore — handoff

- **Status:** IMPLEMENTED — OWNER ACCEPTANCE PENDING
- **Branch:** `task/TASK-008C-discover-and-explore`
- **Base:** `b150db8` (TASK-008B tip)
- **Database:** no schema change. Isolated branch `br-steep-field-b3nti5ov`
  only; nothing written to Production.

## 1. What changed

| File | Change |
| --- | --- |
| `web/src/app/api/v1/discover/route.ts` | NEW `GET /api/v1/discover?q=&topic=` returning posts, creators and trending topics. |
| `web/src/components/discovery/DiscoverExplore.tsx` | NEW real discovery UI: search, trending/category chips, tabs, creator rail, states. |
| `web/src/app/discover/page.tsx` | Real results server-rendered; demonstration directory kept below a separate heading. |
| `web/src/modules/posts/repository.ts` | `suggestedCreators` accepts an escaped ILIKE search term. |
| `web/src/modules/posts/service.ts` | `getSuggestedCreators` forwards the search term. |
| `web/src/modules/posts/provider.ts` | `createDiscoverReadLimiter` (60/min). |
| `packages/domain/src/content.ts` | `DiscoverResultDto`. |
| `tests/discover-route.test.ts`, `tests/discover-ui.test.tsx` | NEW suites. |

No new dependency, no new environment variable, no schema migration.

## 2. Flow

1. `/discover` reads `q`/`topic` from the URL and calls the posts service for
   matching posts, public creator suggestions and 30-day trending topics in
   parallel. A database failure renders an explicit "Discover is unavailable"
   panel — never demo results in its place.
2. `DiscoverExplore` shows those results immediately. Submitting a search or
   choosing a trending topic calls `/api/v1/discover`; the previous results stay
   on screen while it runs and are only replaced by a successful response.
3. A successful response also updates `?q=`/`?topic=` with
   `history.replaceState`, so reloading or sharing keeps the search.
4. Topic chips and the Topics tab both apply the category filter; choosing the
   active topic again clears it.

## 3. Security and privacy review

- Visibility is applied in SQL (`profiles.visibility = 'public' OR own post`)
  and re-checked in the service; a private author's posts and profile never
  appear in search, creator suggestions or trending counts, but the owner sees
  their own matches.
- Trending topics aggregate only public, non-deleted posts.
- Input is bounded (80 chars) and the topic filter is allow-listed
  (`[a-z0-9_]{2,40}`) with a 400 for anything else. LIKE metacharacters are
  escaped, so search cannot be widened into a `%` scan.
- Responses are `no-store` and contain allow-listed DTOs only — no auth subject
  or `identityId` (asserted by a test).
- Discovery reads are rate-limited per caller/peer at 60/minute.
- The demo directory is unchanged and explicitly labelled; real search never
  filters or includes demonstration records.

## 4. Reuse

- Post rendering is `MemberPostCard` from TASK-008A (likes, share, delete,
  sign-in link for like) — no duplicate card.
- `Tabs`, `SearchField`, `Avatar`, `Badge`, `EmptyState`, `ErrorState`,
  `LoadingState` and the existing design tokens are reused, preserving the dark
  navy + mint/teal system.

## 5. Gate results

- `npm run verify` — PASS (format, lint, typecheck, tests, web build, secret
  scan, import boundaries). Audit advisory unchanged (B-5).
- `npm test` — PASS, **34 files / 281 tests** (TASK-008B 268 + 13 new).
- `npm run build` — PASS; `/discover` and `/api/v1/discover` compiled.
- `npm run check:responsive` — **NOT RUN** (Playwright unavailable).
- Live browser check of `/discover` — **NOT POSSIBLE** in this environment
  (no database credentials here, no browser); not claimed.

## 6. Owner actions

- On an isolated Preview with the dev database: open `/discover`, search a
  caption, a name and a `#topic`; select a trending chip; open the Creators and
  Topics tabs; confirm a private profile is absent; check a 360 px phone layout.
- Confirm reloading a `?q=` URL restores the same results.

## 7. Next

Recommended next three tasks are listed in the mission report:
creator follow graph, post detail view with comments, and real community
membership.
