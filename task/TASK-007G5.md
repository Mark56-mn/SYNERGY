# TASK-007G5 — Profile Rendering Recovery and Full-Screen Avatar Viewer

Status: **IMPLEMENTED — LOCAL BROWSER REPRO AND UNIT TESTS PASS; MOBILE PREVIEW NOT YET VERIFIED**

Branch: `task/TASK-007G5-profile-rendering-and-avatar-lightbox`

Base: `task/TASK-007G4-production-cleanup-wiring` (`16dc449`)

## Root cause (reproduced)

Signed-in `/profile` was reproduced locally against the G4 tree with the real
test account, Neon profile, and Cloudinary avatar. The profile page did render,
but the saved avatar URL was a **1×1 grayscale PNG**. `Avatar` scaled that single
blank pixel into an 80px white circle with no fallback. The page also had no
profile-segment `loading.tsx`/`error.tsx`; a failed profile read escaped to the
root boundary and could leave only the shell/loading surface.

## Changes

- `Avatar` now treats failed images and images ≤2px as unusable and renders
  initials instead of a blank circle.
- `MemberProfileView` wraps a usable avatar in an accessible "Expand … profile
  photo" button. It opens a full-screen `Dialog` with visible close control,
  backdrop dismissal, Escape, focus trap/restore, and body scroll lock.
- No photo or unusable photo means no expandable viewer.
- `/profile` now catches profile lookup failure and renders an intentional
  `ErrorState` with a retry link; added `app/profile/loading.tsx` and
  `app/profile/error.tsx`.
- Existing upload, signed-URL, Supabase Storage, Cloudinary post media and
  legacy avatar behavior are unchanged.

## Verification

- format 0, lint 0, typecheck (web + android) 0, tests **32 files / 246**,
  build 0, secret-scan 0, boundaries 0.
- Local signed-in browser repro: profile shell renders at 1024px; avatar was a
  1×1 image before the fix. After the fallback, the avatar renders initials.
- Mobile viewport browser check: **NOT RUN** (the only available Chromium cannot
  launch here — `libnspr4.so` is missing; Cloud browser viewport is 1024px).
- Preview deployment: **NOT DEPLOYED** by this task; no Vercel URL/status.
- Expanded-viewer visual capture: **NOT CAPTURED** because the current test
  account's only saved avatar is an unusable 1×1 image; viewer open/close is
  covered by the jsdom tests.

## Next steps

1. Deploy this branch to a Vercel Preview and verify signed-in `/profile` at
   360px/414px and desktop.
2. Upload a real portrait through the existing flow and verify the expanded
   photo visually.
3. Re-run the mobile Preview check after Vercel creates the deployment.