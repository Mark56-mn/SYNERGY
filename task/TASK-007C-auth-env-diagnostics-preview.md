# TASK-007C — Preview authentication environment diagnostics

## Goal
Resolve the deployed Preview login failure that displayed "Authentication is not configured in this environment." without changing Production credentials or exposing secrets.

## Evidence
- Preview login requests reached `POST /api/v1/auth/login` and were rejected before Supabase checked the submitted credentials.
- Vercel project environment inventory showed entries for `SUPABASE_AUTH_URL` and `SUPABASE_AUTH_ANON_KEY` on Preview and Production. Secret values were not available to the diagnostic connection, so their validity is not yet established.
- `isSupabaseAuthConfigured()` previously caught every `getEnv()` exception and returned `false`. This concealed malformed or missing unrelated environment variables as an Auth-not-configured result.

## Scope
- Preview branch only: `task/TASK-007C-auth-env-diagnostics-preview`.
- Allow environment validation errors to reach the existing API route wrapper. Its logging records the validation error message, which contains variable names only.
- Preserve the local-development behavior: a valid development environment with no Supabase credentials returns `false`.
- Never log or return secret values.
- Do not modify Vercel environment variables, Production, account records, passwords, or Supabase users.
- Do not merge to main.

## Acceptance checks
1. Typecheck, lint, and build pass.
2. Valid development environment with no Supabase credentials still reports Auth unconfigured without throwing.
3. Invalid supplied environment values and missing required non-development values produce a server-side validation error identifying variable names only.
4. Valid Preview environment with both Supabase credentials reaches Supabase Auth and returns the provider's normal success/invalid-credentials response.
5. Confirm no secret values appear in logs or client responses.
6. Re-test sign-in on the Preview deployment after deployment is READY.

## Current implementation
Updated `web/src/server/provider-access.ts`: `isSupabaseAuthConfigured()` no longer swallows `getEnv()` validation failures. The route wrapper already logs unexpected errors server-side and returns a generic response to clients. Commit: `577b5f4ada6d0b90ddd6b1f181c1455c3da2f74f`.

## Status
Implementation committed; automated checks and Preview runtime verification remain pending.
