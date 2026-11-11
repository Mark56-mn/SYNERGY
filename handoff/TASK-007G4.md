# TASK-007G4 handoff

- **Task:** TASK-007G4
- **Status:** IMPLEMENTED — VERIFIED LOCALLY; LIVE MEDIA ROUND-TRIP AND RESPONSIVE BROWSER CHECKS BLOCKED
- **Branch:** `task/TASK-007G4-production-cleanup-wiring`

## Changes

- Production avatar cleanup now uses the real profile service.
- Profile lookup is mandatory; missing/failed lookup returns an error and deletes nothing.
- Saved avatar protection and uncommitted owned-avatar cleanup verified by tests.

## Gates

- format 0, lint 0, typecheck 0, tests 30/239, build 0, secret-scan 0,
  boundaries 0.
- responsive check NOT RUN (Playwright unavailable).
- Live media round-trip NOT RUN (secret not configured).