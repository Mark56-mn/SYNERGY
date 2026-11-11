# TASK-007G handoff

- **Task:** TASK-007G
- **Status:** IMPLEMENTED — VERIFIED LOCALLY; LIVE MEDIA ROUND-TRIP BLOCKED ON OWNER SECRET CONFIGURATION
- **Branch:** `task/TASK-007G-profile-ui-and-supabase-avatar-storage`

## Architecture

- Media project is separate from SYNERGY Auth.
- Env: `SUPABASE_MEDIA_URL`, `SUPABASE_MEDIA_SECRET_KEY`,
  optional `SUPABASE_MEDIA_BUCKET` (default `profile-photos`).
- Neon stores only avatar object paths in `profiles.avatar_url`.
- Private bucket display uses `GET /api/v1/profile/avatar?path=...`, which
  checks profile visibility then redirects to a short-lived signed URL.
- Cloudinary remains for post media; legacy Cloudinary avatar URLs remain valid.

## Gates

- format 0, lint 0, typecheck 0, tests 28/222, build 0, secret-scan 0,
  boundaries 0.
- Live media round-trip not run (secret not configured; endpoint returns 503).