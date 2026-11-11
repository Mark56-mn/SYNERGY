# TASK-007G — Fix Profile UI and Migrate Avatar Storage to Supabase

Status: **IMPLEMENTED — VERIFIED LOCALLY; LIVE SUPABASE UPLOAD BLOCKED ON OWNER APPROVAL**

Branch: `task/TASK-007G-profile-ui-and-supabase-avatar-storage`

Base: `task/TASK-007F-profile-photo-and-account-navigation` at `fe5001a`

## Summary

- Migrated the profile-avatar upload path from Cloudinary to Supabase Storage.
- Neon remains the primary application database; only the avatar object is stored
  in Supabase Storage, with its public URL persisted in Neon `profiles.avatar_url`.
- Preserved previously stored Cloudinary URLs as a backward-compatible
  fallback (validation still accepts them).
- Added a global error boundary and loading state so a failed profile read no
  longer surfaces as a blank white screen.

## Changed files

- `web/src/modules/profile/avatar-upload.ts`: added `SupabaseConfig`, `isSupabaseAvatarUrl`,
  `supabaseAvatarPathFromUrl`, `deleteSupabaseAvatarByUrl`, `supabaseAvatarUploader`;
  updated `assertAvatarUrlAllowed` to allow Supabase URLs (and legacy Cloudinary).
- `web/src/app/api/v1/profile/avatar-upload/route.ts`: now uses Supabase Storage;
  503 names `SUPABASE_AUTH_URL` / `SUPABASE_AUTH_ANON_KEY`.
- `web/src/app/api/v1/profile/route.ts`: best-effort cleanup of replaced/cleared
  Supabase avatar objects on PATCH.
- `web/src/modules/profile/service.ts`: allow Supabase URLs in validation.
- `web/src/app/layout.tsx`: profile read wrapped so a failure degrades to initials
  instead of blanking the app.
- `web/src/app/error.tsx`, `web/src/app/loading.tsx`: global loading/error states.
- `web/src/components/profile/AvatarUpload.tsx`: sends `previousAvatarUrl` for cleanup.
- `web/src/server/env.ts`, `.env.example`: `SUPABASE_STORAGE_BUCKET` (default `avatars`).

## Supabase project

- Configured project reference: `gqvtpvnipfrcqfkdevsx` (SYNERGY, ACTIVE_HEALTHY, eu-central-1).
- Integration lists this project as active. No bucket exists yet.

## Required owner setup (not performed by this agent)

1. Approve creation of a Supabase Storage bucket named `avatars` (or set
   `SUPABASE_STORAGE_BUCKET`).
2. Create owner-restricted RLS policies:
   - INSERT/UPDATE/DELETE only when `(storage.foldername(name))[1] = auth.uid()::text`.
   - SELECT public (or authenticated) for avatar delivery.
3. Set Preview env `SUPABASE_STORAGE_BUCKET=avatars` (optional, defaults to avatars).

## Verification

- `npm run format:check` 0
- `npm run lint` 0
- `npm run typecheck` (web + android) 0
- `npm test` 0 (28 files / 222 tests)
- `npm run build` 0
- `npm run secret-scan` 0
- `npm run check:boundaries` 0
- Live Supabase upload round-trip: **NOT RUN** — bucket/policies not created
  (owner approval required per infrastructure safety gate).
- Account menu touch/links: covered by existing `tests/account-menu.test.tsx`.