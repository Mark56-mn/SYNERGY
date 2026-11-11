# TASK-007G2 — Clean Up Uncommitted Avatar Uploads

Status: **IMPLEMENTED — VERIFIED LOCALLY; LIVE MEDIA ROUND-TRIP AND RESPONSIVE BROWSER CHECKS BLOCKED**

Branch: `task/TASK-007G2-avatar-upload-cleanup`

Base: `task/TASK-007G1-avatar-safety-and-root-error-recovery`

## Summary

- Added secure cleanup endpoint `POST/DELETE /api/v1/profile/avatar-cleanup` (also available as `DELETE /api/v1/profile/avatar`).
- Cleanup only accepts a Supabase object path/URL whose owner segment equals the authenticated member's id; cross-member deletion attempts are rejected with 403 before deletion.
- Cleanup is idempotent and best-effort: deletion failures are swallowed and never mask the original profile-save error.
- Profile save failure now cleans up a newly uploaded pending avatar server-side; the previously saved avatar is never deleted unless the Neon update succeeds.
- Client tracks the pending avatar path and cleans it up on failed save, network failure, cancellation, or navigation away; the saved avatar is preserved on successful save.
- Legacy Cloudinary and Cloudinary post media are untouched; cleanup only targets Supabase media references/URLs.

## Changed files

- `web/src/app/api/v1/profile/avatar-cleanup/route.ts` (new)
- `web/src/app/api/v1/profile/avatar/route.ts` (DELETE + factory re-exports)
- `web/src/app/api/v1/profile/route.ts` (server-side pending cleanup on failed update)
- `web/src/components/profile/ProfileForm.tsx` (pending tracking + cleanup)
- `tests/avatar-cleanup.test.ts` (new)

## Verification

- `npm run format:check` 0
- `npm run lint` 0
- `npm run typecheck` (web + android) 0
- `npm test` 0 (29 files / 228 tests)
- `npm run build` 0
- `npm run secret-scan` 0
- `npm run check:boundaries` 0
- `npm run check:responsive` NOT RUN (Playwright unavailable in VM)
- Live media round-trip: NOT RUN (owner secret not configured)