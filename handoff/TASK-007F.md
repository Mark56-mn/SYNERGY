# TASK-007F — Repair Profile Photo Persistence and Mobile Account Navigation handoff

- **Task:** TASK-007F
- **Status:** IMPLEMENTED — VERIFIED LOCALLY; OWNER ACCEPTANCE PENDING
- **Branch:** `task/TASK-007F-profile-photo-and-account-navigation`
- **Base:** `task/TASK-007B-profile-media-navigation-preview` at `1660700`
- **Database:** Neon `ancient-band-38052550` / branch `br-steep-field-b3nti5ov` /
  `neondb` (unchanged; no migration)

## Root cause

Cloudinary uploads failed with `401 Invalid Signature` because `resource_type`
was included in the signed parameter string. Cloudinary omits `resource_type`
from the signature base string because it is part of the upload URL path. The
server correctly rejected the upload and never overwrote the stored photo.

## Fix

Removed `resource_type` from the signed params and the form body in
`web/src/modules/profile/avatar-upload.ts`. Live round-trip now returns 200 and
persists a Cloudinary URL under `synergy/avatars/<opaque-folder>/`.

## Mobile account navigation

Added `web/src/components/shell/AccountMenu.tsx`, used by `AppShell` on mobile.
It shows the member's saved photo or initials, expands/collapses, is keyboard
accessible, and links to My Profile, Edit Profile, Account Settings and Sign Out.
The root layout now resolves the signed-in member's profile to supply the photo.

## Verification evidence

- `npm run format:check` 0
- `npm run lint` 0 (0 errors)
- `npm run typecheck` (web) 0
- `npm test` 0 (28 files / 222 tests)
- `npm run build` 0
- `npm run secret-scan` 0
- `npm run check:boundaries` 0
- Live: upload 200, PATCH 200, GET after save avatarUrl present, GET after
  logout/login avatarUrl present, `/profile` HTML contains `<img>`.

## Blockers (unchanged)

- Vercel Preview blocked on commit-author/team association; missing Preview
  env vars (DATABASE_URL, Cloudinary trio, MEDIA_PROVIDER_ADAPTER=cloudinary).
- `npm run check:responsive` NOT RUN (Playwright unavailable).
- Owner Android acceptance pending.