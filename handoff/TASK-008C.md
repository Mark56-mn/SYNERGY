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

- Open the Preview **while signed in to the Vercel account that owns team
  `team_ySUNql5RT7Dz4lIOVeSeI0r9`** — the deployment is protected by Vercel
  Authentication, so a signed-out visitor is redirected to Vercel login.
- In the Preview, confirm the deployment detail shows commit `e00a84b` (or the
  docs commit that follows it) and `READY`.
- Open `/discover`, search a caption, a name and a `#topic`; select a trending
  chip; open the Creators and Topics tabs; confirm a private profile is absent;
  check a 360 px phone layout.
- Confirm reloading a `?q=` URL restores the same results.

## 8. Preview deployment preparation (2026-11-10)

### Why the agent cannot deploy or read the Preview itself

| Check | Result |
| --- | --- |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` in this VM | **All unset.** |
| `.vercel/project.json` linkage in the worktree | **Absent** (no local project link). |
| `vercel whoami` / CLI | CLI not installed; every authenticated action needs a token, and `vercel login` needs a browser + email link this VM cannot complete. |
| Vercel API (`api.vercel.com/v2/user`) | `403 missingToken` — no credential to authenticate with. |
| GitHub commit status API | 404/rate-limited without a token; the repository is private to unauthenticated clients, so deployment status cannot be read from GitHub either. |

Nothing was bypassed: no author rewriting, no disabling of SSO/protection, no
Production action, no project or environment change.

### What the push did produce

Pushing `task/TASK-008C-discover-and-explore` to GitHub produced a Vercel
**Git-integration Preview** on the existing `synergy` project. Its stable branch
alias resolves:

- `https://synergy-git-task-task-008c-discover-and-explore-drop2.vercel.app`
- Response: **302 → `vercel.com/sso-api`** (“Protected by Vercel
  Authentication”), which is the SSO gate for an existing deployment; a
  non-existent branch alias in the same team returns
  `DEPLOYMENT_NOT_FOUND` (404).

That is evidence a Preview deployment exists for this branch. It is **not**
proof of the deployed SHA, build conclusion or rendered output: without a token
the agent cannot call `/v6/deployments`, and without a Vercel session it cannot
fetch a single page through the SSO gate. Do not treat the URL as verified.

### Isolated database confirmation

`node scripts/posts-live-check.mjs` against the configured `DATABASE_URL`:
**18/18 PASS**, including:

- `connection targets the isolated task branch [branch=br-steep-field-b3nti5ov]`
- `connection targets project ancient-band-38052550`
- visibility, topic, like-uniqueness, soft-delete and constraint checks
- `test rows removed [remaining=0]`

The Preview’s own `DATABASE_URL` scope cannot be inspected without Vercel
authentication. The owner must confirm it is set **Preview-only** to the same
branch; nothing in this work changed environment variables.

### Route and API checks (local build of `e00a84b`, isolated dev branch)

| Request | Result |
| --- | --- |
| `GET /` | 200, feed renders |
| `GET /discover` | 200, server-rendered results |
| `GET /discover?q=tailoring` | 200, filtered |
| `GET /compose` | **307 → `/login?next=%2Fcompose`** (honest signed-out gate) |
| `GET /api/v1/health` | 200 `{"status":"ok","service":"synergy-web"}` |
| `GET /api/v1/feed` | 200 `{posts, nextCursor}` |
| `GET /api/v1/discover?q=tailoring` | 200 `{query, topic, posts, creators, topics}` |
| `GET /api/v1/discover?topic=tailoring` | 200, topic-filtered |
| `GET /login` | 200 |

### Mobile rendering (real Chromium, 360 and 412 CSS px)

Rendered in Chromium through the chat browser against `next dev` on the
isolated branch, at 360×800 and 412×915. Measured inside the 360/412 px
viewport: `scrollWidth` 345/397 ≤ viewport width, so **no horizontal overflow**,
the bottom navigation is present, tabs and trending chips fit, and the feed,
trending, search results and signed-out `/compose` gate all render as intended.
Screenshots: `docs/evidence/task-008c/`.

The screenshots were produced with temporary verification rows
(`t8verify_ada`, `t8verify_bola`, plus one private profile to prove exclusion),
which were deleted afterwards by `scripts/temp-unseed-008c.mjs`; the working
tree and the dev database are clean again. A real phone (Android, 360–412 dp)
check is still the owner’s step, and the deployed Preview could not be rendered
by the agent because of the SSO gate.

### Blocker summary

**Deployment status: Preview deployment exists, owner-verification blocked.**
The precise blocker is authorization, not code: this workspace has no Vercel
credential or project link, and the existing deployment is behind Vercel
Authentication. To let the agent verify the Preview itself, add `VERCEL_TOKEN`
(and optionally `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`) in project Settings →
Secrets; never paste it into chat. Otherwise the owner performs the checklist
in §6.

## 7. Next

Recommended next three tasks are listed in the mission report:
creator follow graph, post detail view with comments, and real community
membership.
