# TASK-007D — Preview runtime auth diagnostics and blank adapter normalization

## Goal
Identify why the deployed Preview runtime does not see Supabase Auth credentials, while removing a confirmed environment-validation failure caused by a blank optional media adapter setting.

## Evidence
- Vercel runtime error clusters show the previous generic login failure on an older TASK-007B deployment.
- On the newer TASK-007C Preview deployment, the broad catch was removed and the actual validation error surfaced: `MEDIA_PROVIDER_ADAPTER`.
- Vercel lists the media adapter and Supabase variables for Preview/Production. Secret values were not decrypted or inspected.
- The auth environment entries are present in project metadata, but this does not establish what the running function receives.

## Scope
- Branch: `task/TASK-007D-preview-runtime-auth-diagnostics`.
- Preview deployment only.
- Normalize an explicitly blank `MEDIA_PROVIDER_ADAPTER` to the documented `stub` default; preserve validation of non-empty unsupported values.
- Add server-side auth configuration diagnostics containing only `APP_ENV` and boolean presence flags for the two Supabase variables.
- Never return or log secret values, fragments, lengths, or hashes.
- Do not read/decrypt secret environment values through Vercel tools.
- Do not modify environment variables, Production, accounts, passwords, Supabase users, or main.

## Acceptance checks
1. Blank/unset `MEDIA_PROVIDER_ADAPTER` resolves to `stub`.
2. `cloudinary` still requires the Cloudinary credential trio.
3. Any non-empty unsupported adapter value still fails validation.
4. Login runtime logs report only `appEnv`, `authUrlPresent`, and `authAnonKeyPresent` when credentials are unavailable.
5. Valid Preview runtime with both credentials reaches Supabase Auth; invalid credentials return the normal invalid-credentials response.
6. No secret values appear in responses or logs.
7. Typecheck, lint, tests, and build pass; Preview deployment reaches READY.
8. User tests the exact new Preview URL.

## Implementation
- `web/src/server/env.ts`: blank optional media adapter is normalized to the `stub` default.
- `web/src/server/provider-access.ts`: adds `getSupabaseAuthConfigStatus()`, returning environment name and presence booleans only.
- `web/src/app/api/v1/auth/login/route.ts`: logs the sanitized status when Auth is unavailable, then preserves the existing generic client error.

## Status
Code committed; automated checks and Preview runtime verification remain pending. No Production change made.
