# TASK-007G1 — Protect Avatar Replacement and Fix Root-Level Loading Failures

Status: **IMPLEMENTED — VERIFIED LOCALLY; LIVE MEDIA ROUND-TRIP AND RESPONSIVE BROWSER CHECKS BLOCKED**

Branch: `task/TASK-007G1-avatar-safety-and-root-error-recovery`

Base: `task/TASK-007G-profile-ui-and-supabase-avatar-storage` at `7c75317`

## Summary

- Avatar replacement no longer deletes the existing Supabase object during upload.
  The previous object is deleted only after the new reference is successfully
  saved to the profile in Neon (`PATCH /api/v1/profile`). Cancelled or failed
  saves leave the old photo working.
- Uploads remain atomic; a failed upload leaves no newly created object behind
  because deletion of the previous object was removed from the upload path.
- Root layout now resolves authentication fail-closed: `getCurrentSession()`
  failures become signed-out, and profile-read failures remain non-fatal.
- Added `web/src/app/global-error.tsx` so root-layout/render failures show a
  useful recovery screen instead of a blank page.
- Preserved normal signed-in/signed-out navigation when services work.

## Changed files

- `web/src/modules/profile/avatar-upload.ts`: removed previous-avatar deletion from upload.
- `web/src/app/layout.tsx`: wrapped session resolution in try/catch.
- `web/src/app/global-error.tsx`: new root-level recovery boundary.

## Verification

- `npm run format:check` 0
- `npm run lint` 0
- `npm run typecheck` (web + android) 0
- `npm test` 0 (28 files / 222 tests)
- `npm run build` 0
- `npm run secret-scan` 0
- `npm run check:boundaries` 0
- `npm run check:responsive` NOT RUN (Playwright unavailable in VM)
- Live media round-trip: NOT RUN (owner secret not configured)