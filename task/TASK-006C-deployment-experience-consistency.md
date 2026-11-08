# TASK-006C — Deployment and Experience Consistency

Status: **DONE WITH DOCUMENTED ENVIRONMENT LIMITATION (2026-11-08)** — owner verified the final Preview on an Android phone and confirmed test-account creation, successful sign-in and sign-out. Preview is READY for the exact final commit. The Playwright responsive script remained unavailable in the implementation VM; real Chromium viewport checks and owner phone testing provide documented substitute evidence. See §"Owner verification addendum".
Branch: `task/TASK-006C-deployment-experience-consistency`
Base: `a5766de4415e419a50b8b85e3ad0232e7a96f2b6` (`fix/auth-forms-remove-ibadan-branding`)
Starting commit (spec): `c312829` · Implementation commit: `0e97fa8`
Priority: P0 — close the visible deployment/experience gap before starting new product features.

## Mission objective

Make the currently deployed SYNERGY preview reliably show the actual current application experience: a general Nigeria-first social platform (not an Ibadan-specific product), with visible email/password authentication forms and truthful, consistent navigation and feature states. Diagnose why the owner's screen recording still showed location-specific demo content and disabled interactions after the branding/auth configuration work. Do not assume the recording is showing the latest deployment; prove which commit and deployment the owner should open.

This is a bounded completion mission. Do not start profile persistence, social publishing, follows, messaging, payments, media upload, or unrelated roadmap features.

## Non-negotiable repository and safety rules

1. Read `AGENTS.md`, `MASTER_BLUEPRINT.md`, `DECISION_REGISTER.md`, `MVP_SCOPE.md`, `SYSTEM_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `SECURITY_RULES.md`, `QUALITY_GATES.md`, `ROADMAP.md`, relevant TASK-006 task files, and all current handoff files before editing.
2. Treat `docs/SYNERGY_MASTER_PRODUCT_BLUEPRINT_v1.0.md` as normative. Preserve confirmed/recommended/unresolved distinctions.
3. Work only on this task branch. Do not merge, rebase onto, push to, or modify `main`. Do not promote a preview to Production.
4. No GitHub Actions/CI provider. Run the repository's local gates and use Vercel Preview only if existing project access permits it.
5. Do not read, print, copy, commit, or expose secret values. Do not create Supabase users, enable auto-confirm, alter Auth settings, use service_role, or create paid resources.
6. Never claim a live sign-in positive path passed without a genuine owner-approved test account and evidence. Keep TASK-006A/B positive-path status PARTIAL/BLOCKED if still unverified.
7. Keep the navy + mint design system. Avoid broad redesign or dependency-major upgrades.
8. Update `task/` and `handoff/` records. Preserve owner-authored source-of-truth documents from automatic formatting.

## Workstream A — establish deployment truth first

- Inspect the Vercel project configuration, linked Git repository, production branch, latest preview deployments, branch names, commit SHAs, deployment states and deployment URLs.
- Determine which exact deployment/commit is shown in the owner's supplied screen recording if evidence allows. If not determinable, explicitly say so and identify the newest verified preview.
- Verify the latest preview's HTML and rendered behavior for `/`, `/login`, `/register`, `/forgot-password`, `/account`, `/communities`, and `/api/v1/health`.
- Check both generic Preview and Production environment-variable target scopes by variable NAME only. Never retrieve/decrypt values. Required auth names are `SUPABASE_AUTH_URL` and `SUPABASE_AUTH_ANON_KEY`; do not create or change secrets.
- If a deployment is stale, queueing, failed, or linked to the wrong branch/commit, diagnose and fix only within existing permissions. Create a new Preview deployment from this task branch if appropriate. Do not change the Production branch or promote.
- Record the exact preview URL, deployment ID, branch and full commit SHA.

## Workstream B — remove location-specific product identity and demo data

- Search the entire tracked repository, not just the previously edited files, for `Ibadan`, `Bodija`, `Dugbe`, `Akobo`, `Jericho`, `Ring Road`, and other hard-coded city/neighborhood references used as product identity or demo data.
- Remove location-specific references from user-facing copy, seeded/demo content, navigation, page metadata, accessibility labels, tests, fixtures, docs that describe the current product, and generated UI data where inappropriate.
- Replace with neutral, truthful copy for a general Nigeria-first social platform. Do not replace one city with Lagos or another city. Location may appear only in a feature that genuinely needs it and must not define the whole platform.
- Add or strengthen regression tests that scan the complete user-facing demo corpus and key app copy for forbidden city-specific strings. Keep tests targeted so legitimate historical decision records are not silently rewritten.
- Remove stale "Ibadan-first" statements from current-status/next-step documentation. Preserve historical context only where needed and label it historical.

## Workstream C — authentication experience verification

- Inspect actual current source and deployment for login, registration, forgot-password, reset-password, auth callback, account, navigation and logout.
- Confirm login visibly renders Email and Password inputs; registration visibly renders Email, Password and Confirm password inputs. Confirm labels, input types, autocomplete, validation, keyboard usability and accessible errors.
- Confirm the forms do not disappear when auth is unconfigured. If provider config is absent, show the form with a clear, non-misleading submit-time configuration error; do not hide the controls.
- Confirm authenticated navigation/account/logout behavior is correctly wired to the existing secure server-side session architecture.
- Do not introduce a second password store or trust browser-supplied user IDs/roles.
- Distinguish static/HTML presence from real browser behavior and from live provider authentication. Test each separately.

## Workstream D — user-visible shell and truthful feature states

- Inspect the homepage and primary navigation on a real browser viewport.
- Remove any misleading foundation/prototype notices that are no longer useful, but do not conceal genuine unavailable features. Where a feature is not implemented, label it accurately and make disabled controls visibly and accessibly disabled.
- Ensure the plus/create action does not imply that a post can be published if persistence is not implemented. A preview-only composer must say that it is a preview and must not falsely report success.
- Ensure page titles, descriptions, empty states and navigation describe SYNERGY as a general social platform.
- Keep existing responsive design patterns and navy/mint tokens.

## Workstream E — test and independent review

Run and record, at minimum:
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run secret-scan`
- `npm run check:boundaries`
- `npm run verify`
- `npm run check:responsive` if browser dependencies are available; otherwise state why it was not run.
- Android typecheck/export only if relevant files were changed; do not spend time on unrelated Android work.
- Browser-level checks at 360px and 414px widths, plus desktop 1280px/1440px, covering homepage, login, registration, communities and account.
- Inspect actual preview deployment responses after it reaches READY; verify the same commit SHA that was tested.

For every gate, record exact command, exit code and concise result. Separate automated tests, browser verification, Vercel build status and live provider tests. Do not treat mocked tests as live integration evidence.

## Deliverables

1. Corrected implementation on this branch only.
2. `task/TASK-006C-deployment-experience-consistency.md` updated with actual acceptance evidence and any remaining blockers.
3. `handoff/TASK-006C.md` with:
   - starting and final commit SHAs;
   - files changed and why;
   - exact preview URL/deployment ID/branch/commit;
   - all gate commands and results;
   - browser viewport results;
   - repository-wide location-string scan results;
   - auth form and session checks, distinguishing live and mocked;
   - remaining blockers and owner actions;
   - next recommended task.
4. Update `handoff/CURRENT_STATUS.md` to accurately reconcile current source and prior stale statements. Specifically, do not claim auth is absent if it exists; do not claim profile persistence exists if it does not; do not label the product Ibadan-first.
5. Add a concise final mission report with PASS / PARTIAL / BLOCKED per workstream.

## Acceptance criteria

TASK-006C may be marked DONE only if:
- the newest intended Preview deployment is READY and tied to the final task-branch commit;
- the owner can open a single clearly identified URL and see the intended current experience;
- no forbidden location-specific references remain in current user-facing UI/demo content;
- login and registration fields are visibly present and usable in browser checks;
- no misleading authentication or posting success states remain;
- all required quality gates pass, with unavailable gates explicitly documented;
- current handoff/status documents accurately reflect implementation and unresolved live-auth limitations.

If any criterion fails, mark PARTIAL or BLOCKED, identify the precise cause, and provide the smallest next action. Stop after this mission; do not silently begin TASK-007.

## Implementation record (2026-11-08)

Status: **PARTIAL**. Full detail and evidence in `handoff/TASK-006C.md`.

Implemented on this branch (`c312829` → `0e97fa8` + docs):

- `/login`, `/register`, `/forgot-password`, `/reset-password` now always
  render their real controls; an unconfigured provider fails on submit with
  the API's accurate configuration error instead of replacing the form.
- Last city-specific string in the product surface removed
  (`android/app/(tabs)/services.tsx`).
- `scripts/check-responsive.mjs` repaired (stale `/communities/bodija-traders`
  → `independent-traders`, a URL `a5766de` had already renamed).
- `tests/no-location-branding.test.ts` added: fails if `Ibadan`, `Bodija`,
  `Dugbe`, `Akobo`, `Jericho` or `Ring Road` reappears in `web/src`,
  `android/app`, `packages` or `scripts`. Normative/historical records stay
  out of scope by design (D-001 remains CONFIRMED).
- `Sidebar` notice corrected: it no longer claims accounts are not stored.

Gate results (exact): `format:check` 0 · `lint` 0 · `typecheck` 0 · `test` 0
(22 files / 158 tests) · `build` 0 · `secret-scan` 0 · `check:boundaries` 0 ·
`verify` 0 (audit advisory only) · `npm audit --audit-level=high` 1 (pre-existing
B-5) · `check:responsive` **exit 2 = NOT RUN** (no local browser libraries, no
root in this VM).

Browser verification (real Chromium, production build of `0e97fa8`) at
360×800, 414×896, 1280×800, 1440×900 across `/`, `/login`, `/register`,
`/communities`, `/account`: every page rendered with zero horizontal overflow;
`/account` redirected to `/login` at every width; login rendered Email +
Password + submit, registration rendered Email + Password + Confirm password +
submit; empty-submit validation produced `aria-invalid` and visible messages.
Live negative sign-in against the real provider returned a generic 401 with no
`Set-Cookie`.

Not satisfied: no Preview deployment could be identified or produced — this
environment has no Vercel session, no `.vercel/` linkage and no `VERCEL_*`
variables (`npx vercel whoami` → "Logged out."). The acceptance criterion
"a READY Preview tied to the final task-branch commit" is therefore unmet; the
owner must open the project's Deployments page (or grant Vercel access) and
confirm a preview for this branch at `0e97fa8`. Live positive sign-in remains
unverified (B-7b: zero Auth users, no approved test account).


## Owner verification addendum (2026-11-08)

The following evidence supersedes earlier implementation-time statements that Vercel access and the live positive authentication path were blocked:

- Connected Vercel verification found deployment `dpl_7CWeXAL4gQPWbD2ovnSTosNG92Rq` in **READY** state.
- Preview URL: `https://synergy-1ayluu193-drop2.vercel.app`.
- Exact branch: `task/TASK-006C-deployment-experience-consistency`.
- Exact deployed commit: `6a10d64e639115753ba595e5f807151db2363c49`.
- Live Preview routes `/`, `/login`, `/register`, `/communities`, `/account` and `/api/v1/health` were fetched. All returned successful responses; account resolved to the login experience when unauthenticated; login email/password fields and registration email/password/confirmation fields were present; no forbidden city strings were found in rendered HTML.
- Owner tested the Preview on an Android phone and confirmed the experience works. Owner also confirmed successful test-account creation, sign-in and sign-out. This is owner-observed live end-to-end evidence, not an automated integration test.
- `npm run check:responsive` remains **NOT RUN** in the FreeBuff VM because Chromium system libraries were unavailable and root package installation was unavailable. Do not mark that command as passed. The implementation handoff's real Chromium checks at 360×800, 414×896, 1280×800 and 1440×900 remain the automated visual substitute evidence; owner phone testing adds a separate real-device check.
- Preview only. No Production promotion and no `main` changes.

On that basis TASK-006C is closed for sequencing purposes. Preserve the unavailable Playwright gate as a known environment limitation and re-run it when a compatible browser environment is available; it does not block beginning TASK-007.
