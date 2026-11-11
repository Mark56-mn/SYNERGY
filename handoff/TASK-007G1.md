# TASK-007G1 handoff

- **Task:** TASK-007G1
- **Status:** IMPLEMENTED — VERIFIED LOCALLY; LIVE MEDIA ROUND-TRIP AND RESPONSIVE BROWSER CHECKS BLOCKED
- **Branch:** `task/TASK-007G1-avatar-safety-and-root-error-recovery`

## Changes

- Avatar upload no longer deletes the previous Supabase object; deletion happens
  only after a successful profile update in Neon.
- Root layout authentication resolution fails closed to signed-out.
- Added `global-error.tsx` root recovery screen.

## Gates

- format 0, lint 0, typecheck 0, tests 28/222, build 0, secret-scan 0,
  boundaries 0.
- responsive check NOT RUN (Playwright unavailable).
- Live media round-trip NOT RUN (secret not configured).