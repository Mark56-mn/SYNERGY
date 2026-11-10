# TASK-007F — Repair Profile Photo Persistence and Mobile Account Navigation

Status: **IMPLEMENTED — VERIFIED LOCALLY (OWNER ACCEPTANCE PENDING)**

Branch: `task/TASK-007F-profile-photo-and-account-navigation`

Base: `task/TASK-007B-profile-media-navigation-preview` at `1660700`

## Objective

Repair the profile photo upload round-trip so a real Cloudinary photo is
persisted and survives refresh, logout/login and navigation, and replace the
mobile account affordance with a working expandable menu that shows the member's
saved photo or initials and links to My Profile, Edit Profile, Account Settings
and Sign Out.

## Root cause

`cloudinaryAvatarUploader` signed the upload parameters including
`resource_type: "image"`. Cloudinary does not include `resource_type` in its
signature base string (it is part of the upload URL path), so every real upload
failed with `401 Invalid Signature`. The application correctly returned 500
and never overwrote the stored photo, but no photo could be saved.

## Changes

- `web/src/modules/profile/avatar-upload.ts`: remove `resource_type` from the
  signed parameter set and from the form body; update the allowlisted-parameter
  comment. Signature now matches Cloudinary's expected base string.
- `web/src/app/layout.tsx`: resolve the signed-in member's own profile and pass
  `avatarUrl` and `displayName` into the shell so the mobile menu can render the
  real photo.
- `web/src/lib/auth-nav.ts`: extend `AuthNavState` with optional `avatarUrl`
  and `displayName`.
- `web/src/components/shell/AccountMenu.tsx`: new mobile expandable account
  menu with avatar/initials, links and Sign Out; keyboard accessible (Escape,
  outside click, focus management).
- `web/src/components/shell/AppShell.tsx`: use `AccountMenu` in the mobile
  header instead of a static Account link.
- Tests: updated the avatar signature expectation; added `tests/account-menu.test.tsx`.

## Verification

- `npm run format:check` — PASS
- `npm run lint` — PASS (0 errors; warnings cleared)
- `npm run typecheck` (web) — PASS
- `npm test` — PASS (28 files / 222 tests)
- `npm run build` — PASS
- `npm run secret-scan` — PASS
- `npm run check:boundaries` — PASS
- Live Cloudinary round-trip on the isolated dev database: upload returned 200
  with a `res.cloudinary.com/.../synergy/avatars/...` URL; PATCH persisted it;
  GET after save, GET after logout/login and `/profile` HTML all showed the
  photo. Temporary test data was not written to the profile beyond the test
  account's avatar; the dev database remains intact.

## Remaining

- Vercel Preview deployment remains blocked on commit-author/team
  association and missing Preview env vars (DATABASE_URL, Cloudinary trio,
  MEDIA_PROVIDER_ADAPTER=cloudinary) — owner action required, unchanged from
  TASK-007B.
- `npm run check:responsive` NOT RUN (Playwright unavailable in this VM).
- Owner Android acceptance still OWNER TEST REQUIRED.