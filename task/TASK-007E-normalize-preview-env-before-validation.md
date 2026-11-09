# TASK-007E — Normalize Preview environment before validation

## Goal
Fix the Preview login route failure caused by validating the raw `MEDIA_PROVIDER_ADAPTER` value after computing its documented fallback.

## Evidence
On 2026-11-09, the latest Preview deployment logged:
`environment validation failed for: MEDIA_PROVIDER_ADAPTER (names only)`
for `POST /api/v1/auth/login`.

Inspection of `web/src/server/env.ts` showed that `adapter` was normalized with `trim() || "stub"`, but `envSchema.safeParse` still received the original `process.env`. The normalized value therefore never reached schema validation.

## Change
Pass a normalized environment object to Zod:
- spread `process.env`
- override `MEDIA_PROVIDER_ADAPTER` with the already-normalized `adapter`
- preserve rejection of unsupported non-empty adapter values
- do not log or expose environment values

## Scope and safety
- Preview-only branch and deployment.
- No Production environment variables, deployments, accounts, or database records changed.
- No secrets read, printed, or requested.
- Do not merge or promote without owner approval.

## Acceptance checks
1. Typecheck, lint, and relevant env/auth tests pass.
2. A new Preview deployment reaches READY.
3. Preview login no longer fails with the `MEDIA_PROVIDER_ADAPTER` validation error.
4. Supabase authentication succeeds using the user's existing account.
5. Confirm Production remains untouched.
