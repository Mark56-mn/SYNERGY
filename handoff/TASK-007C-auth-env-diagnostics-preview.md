# Handoff — TASK-007C Preview authentication environment diagnostics

## Branch and commit
- Branch: `task/TASK-007C-auth-env-diagnostics-preview`
- Commit: `577b5f4ada6d0b90ddd6b1f181c1455c3da2f74f`
- Base: `task/TASK-007B-profile-media-navigation-preview`

## What changed
- `web/src/server/provider-access.ts`: removed the broad catch in `isSupabaseAuthConfigured()`.
- A valid development environment with absent Supabase credentials still returns `false`.
- A malformed environment or missing required non-development setting now propagates the existing `EnvValidationError` to the API route wrapper. The validation message contains field names only, never values.
- The existing route wrapper logs the sanitized error server-side and keeps the client response generic.

## Why
Preview login was failing before credential verification. Vercel showed both Supabase environment-variable entries on Preview and Production, but secret values could not be inspected. The prior catch masked every environment-validation problem as missing Supabase Auth.

## Next agent actions
1. Run `npm install` (or workspace lockfile-preserving install) and the web package checks: typecheck, lint, build, plus relevant unit tests.
2. Add/adjust focused tests for the valid-development/no-auth case and for malformed/invalid environment propagation, if existing test infrastructure supports them.
3. Wait for the Vercel Preview deployment for this branch to become READY.
4. Inspect only sanitized runtime logs from a single Preview login attempt. Identify the exact invalid/missing variable names, never values.
5. If the validation error identifies a real unrelated configuration issue, fix only that Preview variable in Vercel with owner-approved values. If the two Supabase values are absent/invalid, request owner correction in Preview only.
6. Re-test sign-in. Success means a valid account reaches Supabase; invalid credentials should return the normal generic "Invalid email or password." response, not the configuration message.
7. Do not alter Production, disable SSO protection, reset/delete the user's account, merge to main, or start TASK-008 before owner acceptance.

## Current verification state
- Source inspection: complete.
- Automated checks: not run in this environment.
- Preview deployment: pending.
- Runtime login verification: pending.
