# TASK-007G4 — Wire Production Avatar Cleanup Profile Verification

Status: **IMPLEMENTED — VERIFIED LOCALLY; LIVE MEDIA ROUND-TRIP AND RESPONSIVE BROWSER CHECKS BLOCKED**

Branch: `task/TASK-007G4-production-cleanup-wiring`

Base: `task/TASK-007G3-avatar-cleanup-safety`

## Summary

- Wired the real production profile service into the avatar cleanup route via the existing profile provider.
- Made profile lookup mandatory: missing profile verification or a failed lookup now returns an error and deletes nothing.
- Preserved authentication, same-origin protection, owner-path validation, rate limiting, and server-only credentials.
- Added tests proving deletion cannot happen without a successful profile lookup, saved-avatar protection, and uncommitted owned-avatar cleanup.

## Changed files

- `web/src/app/api/v1/profile/avatar-cleanup/route.ts`
- `tests/avatar-cleanup.test.ts`
- `task/TASK-007G4-production-cleanup-wiring.md`
- `handoff/TASK-007G4.md`
- `handoff/CURRENT_STATUS.md`

## Verification

- `npm run format:check` 0
- `npm run lint` 0
- `npm run typecheck` (web + android) 0
- `npm test` 0 (30 files / 239 tests)
- `npm run build` 0
- `npm run secret-scan` 0
- `npm run check:boundaries` 0
- `npm run check:responsive` NOT RUN (Playwright unavailable in VM)
- Live media round-trip: NOT RUN (owner secret not configured)