# TASK-007G — Fix Profile UI and Migrate Avatar Storage to Supabase handoff

- **Task:** TASK-007G
- **Status:** IMPLEMENTED — VERIFIED LOCALLY; LIVE SUPABASE UPLOAD BLOCKED ON OWNER APPROVAL
- **Branch:** `task/TASK-007G-profile-ui-and-supabase-avatar-storage`
- **Base:** `task/TASK-007F-profile-photo-and-account-navigation` at `fe5001a`

## Root causes addressed

1. Profile avatar uploads targeted Cloudinary; migrated to Supabase Storage.
2. Root layout awaited profile-service construction outside its catch, so an
   unavailable database could surface as a blank page; wrapped in try/catch and
   added global error/loading boundaries.

## Infrastructure safety gate

- Configured project reference `gqvtpvnipfrcqfkdevsx` (SYNERGY) is ACTIVE_HEALTHY.
- No `avatars` bucket exists. Per the safety gate, no bucket or policy was
  created without approval. Owner must create the bucket and RLS policies.

## Env vars (names only)

- `SUPABASE_AUTH_URL` (existing)
- `SUPABASE_AUTH_ANON_KEY` (existing)
- `SUPABASE_STORAGE_BUCKET` (optional, default `avatars`)

## Gates

- format 0, lint 0, typecheck (web + android) 0, tests 28/222, build 0,
  secret-scan 0, boundaries 0.
- Live Supabase round-trip: NOT RUN (bucket/policies missing).