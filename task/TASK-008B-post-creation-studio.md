# TASK-008B — Post creation studio

Status: **IMPLEMENTED — OWNER ACCEPTANCE PENDING**
Branch: `task/TASK-008B-post-creation-studio`
Base: `19c977a` (TASK-008A tip)
Database: isolated Neon branch `br-steep-field-b3nti5ov` (no new tables; TASK-008A migrations only).

## 1. Goal

A signed-in member with a profile can write a caption, attach one photo from
their phone gallery, preview the result and publish it — with honest publishing
states and no fake success when configuration or the network fails.

## 2. Non-goals

- Video, galleries, carousels, scheduling, drafts synced across devices.
- Editing a published post; comments.
- Rich text, mentions, location tagging.

## 3. Acceptance criteria

- `/compose` is reachable from the mobile create button and the desktop
  sidebar; signed-out visitors are redirected to sign-in, members without a
  profile to onboarding.
- Caption is validated client-side for usability and server-side by TASK-008A
  contracts; the counter and derived `#topics` update as you type.
- A photo can be selected from gallery/files (JPEG/PNG/WebP ≤4 MB), previewed,
  replaced and removed.
- Publishing shows an in-flight state; the published state appears only after
  the server returns 201.
- A failed photo upload or failed publish keeps the caption, explains the
  failure and never claims success. With Cloudinary unconfigured, the message
  names the variables and says a text-only post is still possible.
- Draft text is kept in this browser (never the file) and the UI says so.
- Photo uploads are server-authorized, same-origin, rate-limited, magic-byte
  validated, signed server-side into `synergy/posts/<opaque member folder>`,
  and return only the verified `mediaUrl`.

## 4. Implementation

- `web/src/server/media/image-upload.ts` — shared JPEG/PNG/WebP sniffing,
  dimension parsing, size/pixel limits, per-member opaque folders, Cloudinary
  signature and signed upload with folder verification. TASK-007B's avatar code
  now delegates here (`web/src/modules/profile/avatar-upload.ts` keeps its
  public API and error copy, and its existing tests still pass).
- `web/src/app/api/v1/posts/media-upload/route.ts` — `POST` multipart `file`;
  verified session + same-origin + 10/min limit; 503 with exact Preview
  variable names when Cloudinary is not configured; returns `{ mediaUrl }`.
- `web/src/components/compose/PostStudio.tsx` — caption with counter and topic
  preview, gallery/file picker, preview + alt description, remove/replace,
  local draft (text only), publish states, error/status regions.
- `web/src/app/compose/page.tsx` — server-rendered gate (session → profile) and
  the studio.
- `web/src/components/shell/ComposeButton.tsx` — the old preview dialog is
  replaced by real links to `/compose` (mobile FAB and sidebar button).

## 5. Media configuration

Photo attachment requires `MEDIA_PROVIDER_ADAPTER=cloudinary` plus
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in the
runtime/Preview environment. Those values are absent in this agent environment,
so a live Cloudinary round-trip is **not proven**; text-only publishing is. The
endpoint returns 503 with the variable names rather than pretending to upload.

## 6. Tests

- `tests/compose.test.tsx` (6) — empty-caption guard, topic/counter, text
  publish + redirect, failure keeps caption, 503 photo message with no post
  request, draft restore.
- `tests/post-media-route.test.ts` (6) — 401, CSRF 403, 503 configuration
  contract, SVG rejection without calling the uploader, `{ mediaUrl }` only,
  429.
- `tests/avatar-upload.test.ts` (13) — unchanged and still green after the
  shared-media refactor.
- Full gates recorded in `handoff/TASK-008B.md` §5.

## 7. Limitations

- No image cropping/resizing before upload; the server caps bytes and pixels.
- No post editing or media replacement after publishing (delete and repost).
- Drafts are per browser profile, not per account and not encrypted at rest by
  the app.
- Live Cloudinary upload and owner Android acceptance remain owner actions.
