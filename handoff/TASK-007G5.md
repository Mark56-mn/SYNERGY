# TASK-007G5 handoff

- **Task:** TASK-007G5
- **Status:** IMPLEMENTED — LOCAL REPRO + TESTS PASS; MOBILE PREVIEW NOT VERIFIED
- **Branch:** `task/TASK-007G5-profile-rendering-and-avatar-lightbox`
- **Base:** `16dc449` (`task/TASK-007G4-production-cleanup-wiring`)

## Root cause

The signed-in profile was reproduced with the real test account. The page
rendered, but the saved avatar URL pointed at a 1×1 grayscale PNG; `Avatar`
scaled it into a blank white circle. The route also had no segment-level
loading/error state, so a failed profile read could leave an unhandled surface.

## Changed files

- `web/src/components/ui/Avatar.tsx` — unusable-image fallback + display helper.
- `web/src/components/profile/MemberProfileView.tsx` — accessible avatar button
  and full-screen photo viewer.
- `web/src/app/profile/page.tsx` — intentional lookup-failure UI.
- `web/src/app/profile/loading.tsx`, `web/src/app/profile/error.tsx` — segment
  loading and recovery states.
- `tests/ui/member-profile-view.test.tsx` — viewer/fallback tests.
- `tests/profile-page-error.test.tsx` — lookup-failure regression test.

## Design

- Existing navy/mint tokens, `Dialog`, `Avatar`, `ErrorState`, and `LoadingState`.
- Viewer is full-screen (`h-dvh`), portrait contained, visible close, backdrop,
  Escape, focus restoration, and body scroll lock.
- Narrow layouts keep the same responsive profile column and 80px avatar.

## Evidence

- Signed-in local profile HTML and browser screenshot captured at 1024px.
- Before: avatar rendered as a white circle from a 1×1 PNG.
- After: unusable photo falls back to initials; no blank viewer is offered.
- Tests cover open, close button, Escape, backdrop, no-photo, broken image and
  1×1 placeholder.

## Gates

- `format:check` 0; `lint` 0; `typecheck` 0; `test` 32 files / 246; `build` 0;
  `secret-scan` 0; `check:boundaries` 0.
- `check:responsive` NOT RUN: Chromium cannot start here (`libnspr4.so` missing).
- Mobile Preview and expanded-photo visual evidence: NOT VERIFIED.

## Next steps

1. Deploy to Preview and verify `/profile` signed in at 360/414px.
2. Upload a real portrait and verify the full-screen viewer visually.
3. Report Preview URL/deployment status once Vercel creates it.