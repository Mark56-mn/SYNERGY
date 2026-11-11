# TASK-007G — Fix Profile UI and Migrate Avatars to Supabase Media Storage

Status: **IMPLEMENTED — VERIFIED LOCALLY; LIVE MEDIA ROUND-TRIP BLOCKED ON OWNER SECRET CONFIGURATION**

Branch: `task/TASK-007G-profile-ui-and-supabase-avatar-storage`

Base: `task/TASK-007F-profile-photo-and-account-navigation` at `fe5001a`

## Summary

- Diagnosed the profile/account surface and hardened it so a failed profile read
  no longer renders a blank screen: root layout catches profile-read failures and
  global `error.tsx` / `loading.tsx` boundaries exist.
- Migrated profile avatar file storage from Cloudinary to the separate
  `synergy-media` Supabase project (`profile-photos` bucket, private).
- Neon remains the primary application database. Neon stores only the avatar
  object path/reference in `profiles.avatar_url`; image bytes are never stored
  in Neon.
- Cloudinary remains unchanged for post media.
- Uploads and downloads are server-mediated with `SUPABASE_MEDIA_SECRET_KEY`;
  the secret is never exposed to browser code, public env, logs or bundles.
- Private bucket display uses short-lived signed URLs generated server-side
  after profile-visibility checks.

## Environment variables (names only)

- `SUPABASE_MEDIA_URL`
- `SUPABASE_MEDIA_SECRET_KEY`
- `SUPABASE_MEDIA_BUCKET` (optional, default `profile-photos`)

## Changed files

- `packages/domain/src/users-and-profiles.ts`: avatar cap raised to 5 MB.
- `web/src/server/env.ts`, `.env.example`: media env contract.
- `web/src/modules/profile/avatar-upload.ts`: media config, secret-key uploader,
  owner-scoped paths, signed URL helper, media reference validation,
  backward-compatible Cloudinary fallback.
- `web/src/app/api/v1/profile/avatar-upload/route.ts`: media upload route.
- `web/src/app/api/v1/profile/avatar/route.ts`: signed display URL route.
- `web/src/app/api/v1/profile/route.ts`: best-effort cleanup of replaced media.
- `web/src/modules/profile/service.ts`: media-aware avatar validation + visibility helper.
- `web/src/components/ui/Avatar.tsx`: resolves stored media paths to signed display URLs.
- `web/src/components/profile/AvatarUpload.tsx`: 5 MB label and media path handling.

## Supabase media project

- Project: `synergy-media`
- Ref: `vblzbmrdlfusofawvoni`
- Region: `eu-west-2`
- URL: `https://vblzbmrdlfusofawvoni.supabase.co`
- Bucket: `profile-photos` (private, 5 MB max, JPEG/PNG/WebP)
- Bucket already exists; do not recreate it.

## Owner setup still required

1. Set Preview env `SUPABASE_MEDIA_URL` and `SUPABASE_MEDIA_SECRET_KEY`.
2. Optionally set `SUPABASE_MEDIA_BUCKET=profile-photos`.
3. Ensure bucket policies allow server-side secret-key access; browser must not
   receive the secret.

## Verification

- `npm run format:check` 0
- `npm run lint` 0
- `npm run typecheck` (web + android) 0
- `npm test` 0 (28 files / 222 tests)
- `npm run build` 0
- `npm run secret-scan` 0
- `npm run check:boundaries` 0
- Live media upload/display round-trip: **NOT RUN** — owner secret not configured
  in this environment. Endpoint correctly returns 503 when unconfigured.