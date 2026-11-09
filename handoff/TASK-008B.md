# TASK-008B — Post creation studio — handoff

- **Status:** IMPLEMENTED — OWNER ACCEPTANCE PENDING
- **Branch:** `task/TASK-008B-post-creation-studio`
- **Base:** `19c977a` (TASK-008A tip)
- **Database:** no schema change. Isolated branch `br-steep-field-b3nti5ov`
  only; nothing written to Production.

## 1. What changed

| File | Change |
| --- | --- |
| `web/src/server/media/image-upload.ts` | NEW shared image primitives: magic-byte sniffing, PNG/JPEG/WebP dimensions, size/pixel limits, `imageFolderForUser`, Cloudinary signature, signed upload with folder verification. |
| `web/src/modules/profile/avatar-upload.ts` | Delegates to the shared module; public API and error copy preserved. |
| `web/src/app/api/v1/posts/media-upload/route.ts` | NEW `POST` multipart upload for post photos. |
| `web/src/components/compose/PostStudio.tsx` | NEW composer. |
| `web/src/app/compose/page.tsx` | NEW server-gated page. |
| `web/src/components/shell/ComposeButton.tsx` | Dialog replaced with links to `/compose`. |
| `tests/compose.test.tsx`, `tests/post-media-route.test.ts` | NEW suites. |

No new dependency; no environment-variable names beyond the existing
Cloudinary trio and `MEDIA_PROVIDER_ADAPTER`.

## 2. Flow

1. `/compose` resolves the verified session (redirect to
   `/login?next=%2Fcompose`) and the member's profile (redirect to
   `/onboarding`). The studio is never shown to someone who cannot publish.
2. Caption + optional photo are held in component state. Text (not the file) is
   written to `localStorage` as a draft after typing, and the UI says so.
3. Publish: if a file is attached, `POST /api/v1/posts/media-upload` validates
   and uploads it; the returned `mediaUrl` is then sent with
   `POST /api/v1/posts`. If the upload fails, nothing is published and the
   caption/file stay.
4. A 201 triggers the published state, clears the draft and routes to the
   member's profile.

## 3. Honest states

- Empty caption → Publish disabled.
- Publishing → button and inputs disabled, badge reads “Publishing…”.
- Failure → `role="alert"` with the server message, content retained.
- Cloudinary absent → 503 message names `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `MEDIA_PROVIDER_ADAPTER` and
  says a text-only post is still possible. No post request is made.
- Draft restore → `role="status"` “Draft restored from this device.”

## 4. Security review

- Author identity comes from the verified session, never the form.
- Upload is same-origin + rate-limited (10/min) and validated by magic bytes;
  declared MIME is only a hint and a mismatch is rejected.
- Folder is derived server-side from the opaque member id; `public_id` is
  generated; the API secret never leaves the server; only `mediaUrl` returns.
- The persisted URL must match the configured cloud and `synergy/posts` folder
  (the create-post service repeats that check).
- Alt text is bounded at 280 characters and stored with the post.

## 5. Gate results

- `npm run verify` — PASS (format, lint, typecheck, tests, web build, secret
  scan, import boundaries). Audit advisory unchanged (B-5).
- `npm test` — PASS, **32 files / 268 tests** (TASK-008A 256 + 12 new).
- `npm run build` — PASS; `/compose` and `/api/v1/posts/media-upload` compiled.
- `npm run check:responsive` — **NOT RUN** (Playwright unavailable).
- Live Cloudinary upload — **NOT PROVEN** (no credentials in this environment).

## 6. Owner actions

- Add Preview-only `CLOUDINARY_*` + `MEDIA_PROVIDER_ADAPTER=cloudinary` (and the
  isolated `DATABASE_URL`) as recorded in `handoff/TASK-007B.md` §4.
- On a device: sign in → create button → write a caption → choose a gallery
  photo → preview → publish → confirm the photo renders in the feed/profile
  after refresh. Also confirm the text-only path succeeds with no Cloudinary
  configured.

## 7. Next

TASK-008C (Discover & Explore) builds on this branch.
