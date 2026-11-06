# TASK-004 — Responsive user experience — Handoff

Status: **DONE** (interface layer only; no persistence, no auth, no deployment, no merge)
Branch: `chore/autonomous-foundation-v1`
Base: `82e025456165d34fe1428436d648e03758954146` (TASK-003 tip, verified local == remote)
Authorised by: MISSION 02 (owner), TASK-004 specification.

---

## 1. Features and screens implemented

| Screen | Route | What is there |
| --- | --- | --- |
| Home feed | `/` | Product intro (mint/navy), four discovery entry points, feed tabs (For you / Local / Creators / Communities / Marketplace), local category filtering, demo disclosure, post cards for text, image and video posts |
| Discovery | `/discover?tab=people\|communities\|videos\|businesses\|products` | Five tabs, local search over demo records, honest no-results state, cards for people, communities, videos, businesses and products |
| Communities | `/communities` | Community discovery grid, public/private presentation, member counts, disabled join action |
| Community detail | `/communities/[slug]` (SSG) | Overview, description, member count, house rules, private-community members-only state, join placeholder |
| Individual profile | `/u/[handle]` (SSG) | Cover, avatar, name, handle, bio, interests, stats, Posts / About / Media tabs |
| Creator profile | `/u/[handle]` (same component) | Creator badge variant, same structure, media grid |
| Business profile | `/b/[handle]` (SSG) | Business badge, category and service area, capabilities, Services & products block, same tabs |
| Not found | `not-found.tsx` | Honest 404 with a route back |

Reusable presentation: `PostCard`, `PostSkeleton`, `FeedStream`, `DiscoveryExplorer`, `CommunityCard`, `VideoCard`, `ProfileView`, `MediaPreview`.

## 2. Important file paths

| Path | Role |
| --- | --- |
| `web/src/lib/demo-content.ts` | All fictional demo records, `DEMO_DISCLOSURE`, `formatCount`, `getAuthor`, `getCommunity` |
| `web/src/components/shell/{AppShell,Sidebar,RightRail,ComposeButton}.tsx` | Responsive shell: sidebar ≥1024, top bar mobile, rail ≥1280, persistent demo strip |
| `web/src/components/feed/{PostCard,FeedStream}.tsx` | Post presentation, skeleton, tabs and local filtering |
| `web/src/components/discovery/DiscoveryExplorer.tsx` | Five-tab discovery with local search |
| `web/src/components/communities/CommunityCard.tsx` | Community card incl. disabled join |
| `web/src/components/videos/VideoCard.tsx` | Video preview card with duration and play presentation |
| `web/src/components/profile/ProfileView.tsx` | Shared individual/creator/business profile |
| `web/src/components/ui/*` | `Icon`, `Avatar`, `Input`/`SearchField`, `Tabs`, `Dialog`, `MediaPreview`, `BottomNav`, plus TASK-003 `Button`, `Card`, `Badge`, `States` |
| `web/src/app/{page,layout,not-found}.tsx`, `discover/`, `communities/`, `u/[handle]/`, `b/[handle]/` | Routes |
| `web/src/app/globals.css` | Safe-area utilities, `.no-scrollbar`, `.demo-cover` token art |
| `web/tailwind.config.ts`, `packages/design-tokens/{src/index.ts,tokens.css}` | Extended token set |
| `tests/ui/*.test.tsx`, `tests/demo-content.test.ts`, `vitest.config.ts` | Component and content tests |

## 3. Shared components and design tokens

Tokens are additive extensions of the single TASK-003 source (`packages/design-tokens`), mirrored into `tokens.css` and `web/tailwind.config.ts`:

- **Colour**: unchanged brand base — dark navy surfaces (`bg`, `surface`, `surface-raised`), mint accent (`primary`), mint-tinted `primary-soft`, `ink` / `ink-muted`, `border`; **new** `success`, `overlay`.
- **Radius**: existing `sm`/`md`/`lg`; **new** `full`.
- **Spacing**: existing scale; **new** `2xl`.
- **Shadow**: **new** `raised` (used sparingly — dialogs and the mobile composer FAB).
- **Type**: **new** `typeScale` (display / title / body / caption) alongside the existing font sizes.
- **Layout**: **new** `maxWidth.content` (42rem central column) and `maxWidth.rail` (20rem contextual rail).

Colour pattern for the next agent: page `bg` → cards `surface` with `border` → elevated/dialog `surface-raised` → all interactive focus rings `primary` with `ring-offset` on `bg`. Mint is used for action and emphasis only, never for large surfaces. Demo/disabled affordances are amber-bordered (`badge` variant) or dashed-border muted, deliberately distinct from live actions.

Primitives (all keyboard accessible, no new runtime dependencies): `Button` (variants/sizes, disabled and `aria-disabled` states), `Card`, `Badge`, `Avatar` (initials + stable tint from the handle, no photos), `TextField`/`SearchField`, `Tabs` (roving tabindex, Arrow/Home/End, `role="tablist"`), `Dialog` (portal, focus trap, Escape, scroll lock, focus restore, `aria-modal`), `MediaPreview` (token-art image/video stand-in with a text label), `States` (empty / error / loading / skeleton), `Icon` (20 inline SVGs, no icon package).

## 4. Responsive behaviour

Single layout, three breakpoint states — no separate mobile site:

- **< 640px**: compact top bar (brand + search), single content column, bottom navigation with a raised Create action, `96px` bottom padding so the last card always clears the bar, safe-area padding for device insets.
- **640–1023px**: same structure, wider gutters, bottom navigation retained (it is the only primary navigation until `lg`), multi-column discovery grid.
- **≥ 1024px**: left sidebar navigation with Create button, centred 42rem content column.
- **≥ 1280px**: right contextual rail (Explore shortcuts, communities to watch, video picks, demo note).
- Demo disclosure strip is persistent at every width; the composer dialog is a five-field sheet on mobile, centred modal on desktop.

## 5. Implemented interactions

Everything below runs locally in the browser and is labelled as such where it does not persist:

- Bottom navigation and sidebar route between Home, Discover, Communities, Profile and the Create entry point (real Next.js navigation).
- Feed tabs switch and filter the demo posts locally; "Show loading state" reveals the skeleton states.
- Discovery tabs switch category and the search field filters the visible demo records client-side (searching `homefix` leaves Bola Homefix and removes unrelated people).
- Profile tabs switch between Posts, About and Media; community pages link back to the community index.
- Composer dialog opens from either Create button, traps focus, locks background scroll, closes on Escape/backdrop/close button and restores focus to the trigger. Its publish button is disabled with an explanation.
- Like toggles visually (`aria-pressed`) and the card states that preview actions are not saved.

## 6. Demo-only or placeholder behaviour (explicit)

- **All people, businesses, communities, videos and listings are fictional** Ibadan-context examples. No real personal data, no real business, no real member. Each card carries a `Demo` badge and the shell carries a permanent disclosure strip.
- No images are loaded: cover art and post media are CSS token gradients with a text label ("DEMONSTRATION MEDIA"). No stock photos, no copyrighted footage.
- Comment and Share are `aria-disabled` with an explanation; no fake counts change.
- Follow, Message, Join/Request to join, and Publish are disabled with explanatory copy — the UI never reports success for an operation that did not happen.
- Search is client-side filtering of demo records, and says so ("No live search service is connected").
- No verification badges exist; badges only distinguish Individual / Creator / Business / Demo, and private communities are labelled as private rather than implied to be joined.
- Stats are marked `(demo)`; nothing is presented as an authenticated user or a stored record.

## 7. Tests and quality-gate results

Run from the repository root on this branch; exit codes as observed.

| Gate | Command | Exit | Result |
| --- | --- | --- | --- |
| Dependencies | `npm install -D -W @testing-library/react @testing-library/dom jsdom @testing-library/user-event` | 0 | Dev-only test dependencies added; lockfile updated, no runtime dependency added |
| Formatting | `npm run format:check` | 0 | Clean (owner docs and planning records remain excluded) |
| Lint | `npm run lint` | 0 | 0 errors, 0 warnings (fixed raw `<a href="/">` → `next/link`) |
| Typecheck | `npm run typecheck` | 0 | web, android, domain, design-tokens |
| Unit + component tests | `npm test` | 0 | **11 files, 55 tests passed** (TASK-003 baseline: 6 files, 40 tests) |
| Web production build | `npm run build` | 0 | All app routes prerendered (`/`, `/discover`, `/communities`, `/communities/[slug]`, `/u/[handle]`, `/b/[handle]`, not-found); First Load JS shared 102 kB, home 113 kB |
| Import boundaries | `npm run check:boundaries` | 0 | Clean, 45 files checked |
| Secret scan | `npm run secret-scan` | 0 | Clean, 131 tracked files scanned |
| Diff review | `git status`, `git diff` | — | Additive changes only; no secrets, no `.env`, no generated output; owner-authored documents untouched |
| Dependency audit | `npm audit` | 1 | Unchanged from TASK-003 (21 affected packages / 7 families — see `handoff/TASK-003.md` §8); not claimed as a pass |

New tests: `tests/ui/tabs.test.tsx` (arrow/Home/End navigation, selection), `tests/ui/dialog.test.tsx` (open/close, focus trap, Escape, focus restore), `tests/ui/post-card.test.tsx` (demo labelling, like toggle, disabled comment/share, media label), `tests/ui/discovery.test.tsx` (tab switching, local search filtering, empty state), `tests/demo-content.test.ts` (record integrity: unique handles, community/authors resolve, no photo URLs, disclosure text present). No existing test was weakened or skipped.

Component tests run in jsdom with `esbuild.jsx = "automatic"`; `vitest.config.ts` includes `**/*.test.{ts,tsx}` so the existing root suite is unaffected.

## 8. Visual-review results

Rendered inspection (not source reading) with headless Chromium against the running dev server, pages `/`, `/discover`, `/communities`, `/communities/bodija-traders`, `/u/amara.makes`, `/b/bola.homefix`, plus the composer dialog:

| Viewport | Result |
| --- | --- |
| 360 × 800 (small mobile) | No horizontal overflow (`scrollWidth == innerWidth`); single column; bottom nav clears content (96px pad); tabs wrap to two rows; text wraps without truncation |
| 414 × 896 (large mobile) | Same, comfortable line lengths, no clipping |
| 768 × 1024 (tablet) | No overflow; centred column, bottom nav retained and content clears it; discovery grid in two columns |
| 1440 × 900 (desktop) | No overflow; sidebar 256px, content 42rem, rail present; banner aligned with sidebar padding; cards keep proportions |

**Defects found in the rendered output and fixed:**

1. **Tablet content sat under the bottom navigation.** `main` used `sm:pb-8` while the bottom bar remains visible until `lg`, so the final card could be hidden at 640–1023px. Fixed to `pb-24 lg:pb-8` (verified: 96px at 360/768, 32px at 1440).
2. **Tab strips clipped their last labels on narrow screens.** The scroll container hid "Marketplace" and "Businesses" with no affordance. Tabs now wrap (`flex flex-wrap`), so all five labels are visible on one or two rows at 360px with no clipping.
3. **Disabled CTAs looked enabled.** Follow and Request-to-join used filled mint at reduced opacity. They now use a dashed muted outline, consistent with the other preview-only actions.

Also checked: zero console errors and zero page errors on every page; the small "N" badge overlapping the sidebar in desktop screenshots is Next.js's development indicator, not application UI.

## 9. Accessibility findings

- One `<h1>` per page; sections use `<h2>`; feed cards use article semantics and `<time dateTime>` for timestamps.
- Landmarks: `header`, `nav` (primary + labelled), `main` (with skip link as first focusable element), `aside` (labelled rail/sidebar), `footer`.
- `Tabs`: `role="tablist"`/`tab`/`tabpanel`, roving tabindex, ArrowLeft/Right, Home/End, `aria-selected`.
- `Dialog`: `role="dialog"`, `aria-modal`, labelled title, initial focus inside, Tab cycling, Escape to close, focus returned to the trigger, background scroll locked.
- Like control exposes state via `aria-pressed`; non-functional controls use `aria-disabled` plus visible explanatory text instead of silently doing nothing.
- Visible focus: mint ring with offset on every interactive element; touch targets ≥ 40px, most ≥ 44px.
- Contrast: body `ink` and `ink-muted` on navy surfaces pass AA for text sizes used; mint on navy and navy on mint for primary actions pass AA.
- Text alternatives: token-art media carries the label text (e.g. "Demonstration media — Three work shirts on a rail") rather than an empty box; icons are `aria-hidden` with adjacent text or an accessible name.
- Residual issues: no automated axe run (no browser in the gate path), and the rail's decorative art is intentionally low contrast (decorative only, no information carried).

## 10. Performance observations

- **No new runtime dependencies** — no icon, animation or component library; icons are inline SVG and media is CSS.
- **No image requests at all** in this build (no photos, no video files), so the demo surfaces are effectively text + CSS.
- All routes are statically prerendered; shared First Load JS is 102 kB (113 kB on home) after adding the entire experience layer, which is within the existing TASK-003 budget.
- No animation beyond short colour/opacity transitions; no fonts are downloaded.
- Low-bandwidth posture holds: mobile-first single column, no autoplaying media, no large bundles per route.

## 11. Known limitations

1. **Nothing persists.** No database, no auth, no session; likes, follows, joins, posts and messages are previews only and are labelled as such.
2. Search filters the in-file demo records; there is no search service, ranking, or recommendation.
3. Video cards are presentation only — no playback, no upload, no transcoding.
4. Communities have no membership model; private communities show a members-only state rather than pretending membership.
5. Tablet widths (640–1023px) use a centred column with no sidebar; the rail appears only at `xl`.
6. Listings exist only as the business-profile block and discovery product records, not as a marketplace.
7. No messaging UI, no notifications surface beyond component states, no ads/sponsored separation beyond layout flexibility.
8. Android was not feature-built: it keeps the TASK-003 five-tab foundation and accepts the same tokens, but has no feed/profile screens yet.
9. No CI (G-5) and no deployment; all gates are local.

## 12. Next recommended task

Product-critical next step is the **identity + profile persistence slice** (roadmap Phase 1 item 6), which needs G-2 provisioning (blocker B-3) and unlocks real sessions, real profiles and the first migration. If provisioning is not yet approved, **TASK-005 (test/quality-gate extension)** is the safe parallel task: extend coverage per `QUALITY_GATES.md`, add an automated accessibility check, and record dependency-triage decisions (blocker B-5). Do not start either without authorisation.

## 13. Rollback / recovery

All TASK-004 changes are additive: token additions, new components, new routes, new tests and documentation. Reverting the feature commits removes the experience layer and restores the TASK-003 shell; the token extensions are backward compatible, so reverting only part of the set cannot break existing components. `main` is untouched and nothing was deployed.
