# TASK-007G3 — Fail-Closed Avatar Cleanup and Onboarding Coverage

Status: **IMPLEMENTED — VERIFIED LOCALLY; LIVE MEDIA ROUND-TRIP AND RESPONSIVE BROWSER CHECKS BLOCKED**

Branch: `task/TASK-007G3-avatar-cleanup-safety`

Base: `task/TASK-007G2-avatar-upload-cleanup`

## Summary

- Cleanup endpoint now fails closed when the authenticated member's current profile cannot be read; no deletion occurs.
- Supabase avatar URLs and object paths are canonicalized to one object path before comparison and deletion.
- Saved avatars are protected even when stored and submitted references use different URL/path representations.
- Onboarding failures now trigger best-effort cleanup of newly uploaded avatars without masking the original error.
- Client pending-avatar ref is updated synchronously on upload success and cleanup completion.
- Ownership validation, same-origin protection, rate limiting, and server-only media credentials are preserved.

## Changed files

- `web/src/modules/profile/avatar-upload.ts`
- `web/src/app/api/v1/profile/avatar-cleanup/route.ts`
- `web/src/app/api/v1/profile/route.ts`
- `web/src/app/api/v1/profile/onboarding/route.ts`
- `web/src/components/profile/ProfileForm.tsx`
- `tests/avatar-cleanup.test.ts`
- `tests/profile-onboarding-cleanup.test.ts`

## Verification

- `npm run format:check` 0
- `npm run lint` 0
- `npm run typecheck` (web + android) 0
- `npm test` 0 (30 files / 235 tests)
- `npm run build` 0
- `npm run secret-scan` 0
- `npm run check:boundaries` 0
- `npm run check:responsive` NOT RUN (Playwright unavailable in VM)
- Live media round-trip: NOT RUN (owner secret not configured)