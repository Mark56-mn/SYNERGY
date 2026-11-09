# Handoff — TASK-007D Preview runtime auth diagnostics

## Branch and latest commit
- Branch: `task/TASK-007D-preview-runtime-auth-diagnostics`
- Latest commit at handoff preparation: `a9d022e41268281f21f64790331cce67a098f3ab`
- Base: TASK-007C documentation commit `7e8cd010bc3b457e80ec6daed02f738b5db27dd2`

## Findings carried forward
- The previous TASK-007B deployment emitted the generic Auth-not-configured error.
- TASK-007C surfaced the actual validation failure on its newer Preview deployment: `MEDIA_PROVIDER_ADAPTER`.
- Vercel project metadata lists both Supabase variables for Preview and Production, but values were not decrypted. Presence in project settings is not proof of runtime injection.
- Hobby runtime log retention is limited; a 24-hour runtime log query failed, so use the runtime error clusters and a fresh login request.

## Changes
- `web/src/server/env.ts`: explicitly blank `MEDIA_PROVIDER_ADAPTER` now resolves to `stub`; non-empty unsupported values still fail validation.
- `web/src/server/provider-access.ts`: `getSupabaseAuthConfigStatus()` reports only `appEnv`, `authUrlPresent`, `authAnonKeyPresent`, and `configured`.
- `web/src/app/api/v1/auth/login/route.ts`: on missing Auth config, logs only environment name and two booleans; client error remains generic.
- No credential values, partial values, lengths, or hashes are logged.

## Next agent actions
1. Run install with the repository's existing package manager/lockfile; do not regenerate lockfiles unnecessarily.
2. Run relevant tests, typecheck, lint, and production build for the web app.
3. Add focused tests for blank adapter normalization and safe auth-config status if existing test infrastructure supports them.
4. Wait for the Preview deployment from this branch to become READY.
5. Trigger exactly one login attempt on that Preview and inspect fresh runtime error/log records.
6. If booleans show either credential absent, investigate Vercel runtime injection and Preview target configuration without decrypting or printing secrets. If both are present, verify URL parsing/provider response without exposing credential data.
7. Do not change Production, decrypt secrets, reset/delete the user's account, disable SSO, merge to main, or start TASK-008 before owner acceptance.

## UI / product context
- SYNERGY visual system remains dark navy with mint/teal accents.
- This task is backend diagnostics only; do not alter UI.
- Keep user-facing auth errors generic and do not reveal provider configuration details.

## Verification state
- Source edits committed.
- Automated checks: not run.
- Preview deployment: pending.
- Fresh runtime auth verification: pending.
