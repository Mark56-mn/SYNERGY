# Handoff — TASK-007E Normalize Preview environment before validation

## Branch
`task/TASK-007E-normalize-preview-env-before-validation`

## Base
`6d32cf0ece260343b02fdd7da6879c99e3e29075` (TASK-007D)

## Commits
- `1b8db070242d44a575c8b3de5a305e50be558e86` — normalize adapter input before Zod validation
- `e045d4c7fe8feaebe41579dc964a856d01cdda7f` — task specification

## Root cause
Vercel Preview runtime log for `POST /api/v1/auth/login`:
`environment validation failed for: MEDIA_PROVIDER_ADAPTER (names only)`.

In `web/src/server/env.ts`, the code computed:
`const adapter = process.env.MEDIA_PROVIDER_ADAPTER?.trim() || "stub"`
but then called `envSchema.safeParse(process.env)`. The schema saw the raw environment entry rather than the normalized fallback.

## Implementation
`envSchema.safeParse` now receives a copied environment object with `MEDIA_PROVIDER_ADAPTER: adapter` overriding the raw entry. Empty/whitespace values use `stub`; non-empty unsupported values still fail the enum validation. No environment values are logged.

## UI/product context
No UI changes. Preserve SYNERGY's dark navy and mint/teal visual system.

## Verification status
- GitHub branch and source change created.
- Tests, typecheck, lint, and build have NOT yet been run.
- No deployment has been created yet.
- Production has not been changed.

## Next agent actions
1. Inspect the diff and relevant environment/auth tests.
2. Add or update a regression test proving blank/whitespace adapter input normalizes to `stub`, while unsupported non-empty values remain invalid.
3. Run the repository's documented test, typecheck, lint, and build commands.
4. Fix any failures on this branch only.
5. Deploy Preview only and inspect runtime logs after a single login attempt.
6. Ask owner to test with their existing account; do not request or expose credentials.
7. Do not merge/promote or start TASK-008 without explicit owner approval.
