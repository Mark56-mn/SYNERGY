# TASK-007G3 handoff

- **Task:** TASK-007G3
- **Status:** IMPLEMENTED — VERIFIED LOCALLY; LIVE MEDIA ROUND-TRIP AND RESPONSIVE BROWSER CHECKS BLOCKED
- **Branch:** `task/TASK-007G3-avatar-cleanup-safety`

## Changes

- Fail-closed profile lookup in avatar cleanup.
- Canonical Supabase avatar reference normalization.
- Protected saved avatars across URL/path representations.
- Server-side best-effort cleanup for failed onboarding.
- Synchronous client pending-avatar ref updates.

## Gates

- format 0, lint 0, typecheck 0, tests 30/235, build 0, secret-scan 0,
  boundaries 0.
- responsive check NOT RUN (Playwright unavailable).
- Live media round-trip NOT RUN (secret not configured).