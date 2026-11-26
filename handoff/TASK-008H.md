# TASK-008H — Cloudinary signed-upload correction — handoff

- **Status:** IMPLEMENTED — LOCAL VERIFICATION PASS; OWNER PREVIEW TEST PENDING.
- **Branch:** `task/TASK-008H-cloudinary-signed-upload-correction`
- **Base branch:** `task/TASK-008G-preview-image-upload-diagnostics`
- **Base commit (verified against the remote tip before branching):** `d4d77d49f24954e93e7975334f0811c6e8c04e72`
- **Implementation commit:** `8d4559716cc7748cddee7b969d88b6627cb67b15` (code, tests, task file)
- **Documentation commit:** this handoff and the `handoff/CURRENT_STATUS.md` note, immediately after the implementation commit.
- **Owner authorization:** explicit request on 2026-11-26 to correct the signing mismatch identified by TASK-008G, on an isolated branch.
- **Deployment:** none. Nothing was deployed, merged or promoted; no branch other than TASK-008H was modified.

## 1. Root cause

`uploadImageToCloudinary` in `web/src/server/media/image-upload.ts` built the
signature and the multipart body from different parameter sets:

```ts
// signed
{ folder, public_id, resource_type: "image", timestamp }
// submitted
{ api_key, timestamp, signature, folder, public_id,
  resource_type: "image", overwrite: "false", unique_filename: "true" }
```

Cloudinary's signing rule for a direct REST upload (`upload_images`, step 4:
"generate a signature of **all** request parameters including the `timestamp`
parameter and any optional parameters added, but excluding the `api_key`,
`resource_type`, `cloud_name` and `file` parameters") means:

- signing `resource_type` breaks the signature, because Cloudinary strips it —
  for the REST API the resource type is a **path segment** (`/image/upload`),
  per the upload API reference ("the `resource_type` is included in the endpoint
  URL when using the REST API");
- sending `overwrite` and `unique_filename` without signing them also breaks the
  signature, because every submitted non-excluded parameter is part of the
  signed payload.

The provider therefore answered **HTTP 401 Unauthorized**, which the route
correctly surfaced as `provider_status` through the TASK-008G diagnostics.

## 2. Correction

Signed parameters (exactly what is submitted except the four excluded fields):

```
folder=<folder>&overwrite=false&public_id=<publicId>&timestamp=<unixSeconds><apiSecret>
```

alphabetically sorted, `&`-joined, API secret appended with no delimiter, SHA-1,
lower-case hex. This is what `cloudinarySignature` already did correctly — only
its input was wrong.

Multipart body: `file`, `api_key`, `signature`, `folder`, `overwrite=false`,
`public_id`, `timestamp`. `resource_type` and `unique_filename` are gone.

`unique_filename=true` had no effect anyway: Cloudinary only applies it with
`use_filename=true`, which this flow does not send, because the server always
generates the `public_id`. Removing it keeps the request minimal and signed.

Preserved unchanged: the opaque per-member folder (`imageFolderForUser`), the
server-generated `public_id` (`<prefix>_<sha256 prefix 12>`), the `image/upload`
endpoint, `isCloudinaryFolderUrl` verification of the returned `secure_url`, the
`MediaProviderFailure` classification from TASK-008G (`network`, `timeout`,
`provider_status`, `malformed_response`, `invalid_url`), the same user-facing
message, and the same response shape for both the avatar and post-photo routes.

### Drift-proofing

A new exported `buildCloudinaryUploadPlan({ folder, publicId, timestamp, config })`
returns `{ url, signedParams, signature, fields }`, where
`fields = { ...signedParams, api_key, signature }`. Because the body is derived
from the signed set, a future parameter is either signed **and** sent, or
neither — the two lists cannot drift apart again. It is a pure function, so the
regression tests pin the exact signature input and field set without a network
call.

`CLOUDINARY_UNSIGNED_UPLOAD_FIELDS` documents the four excluded fields next to
the code and is asserted by test.

## 3. Files changed

| File | Change |
|---|---|
| `web/src/server/media/image-upload.ts` | Signed set corrected to `folder`/`overwrite`/`public_id`/`timestamp`; new `buildCloudinaryUploadPlan`, `CloudinaryUploadPlan`, `CLOUDINARY_UNSIGNED_UPLOAD_FIELDS`; body built from the plan; `resource_type` and `unique_filename` removed from the body; doc comment corrected. |
| `tests/cloudinary-signed-upload.test.ts` (new) | 10 regression tests over the signed set, the field set and the actual `FormData` sent to `fetch`. |
| `tests/avatar-upload.test.ts` | The pre-existing determinism test now signs the corrected avatar parameter set instead of `resource_type`. |
| `task/TASK-008H-cloudinary-signed-upload-correction.md` (new) | Task specification, documentation sources, ACs, test plan, risks. |
| `handoff/TASK-008H.md` (new) | This handoff. |
| `handoff/CURRENT_STATUS.md` | TASK-008H status note appended. |

No other file was touched. `git status --short` in the worktree was clean apart
from the files above at commit time.

## 4. Tests and exact results

Run in the TASK-008H worktree (dependencies reinstalled with `npm ci` from the
unchanged lockfile, because the workspace restore had dropped `node_modules`):

| Command | Result |
|---|---|
| `npx vitest run tests/cloudinary-signed-upload.test.ts tests/avatar-upload.test.ts tests/post-media-route.test.ts tests/post-media-diagnostics.test.ts tests/compose.test.tsx` | PASS — 5 files / **51 tests** |
| `npm run lint` | PASS (exit 0) |
| `npm run typecheck` | PASS — web + android (exit 0) |
| `npm test` | PASS — **36 files / 307 tests** (was 35 / 297 on TASK-008G; +1 file, +10 tests) |
| `npm run format:check` | PASS |
| `npm run build` | PASS — Next production build (exit 0) |
| `npm run secret-scan` | PASS |
| `npm run check:boundaries` | PASS |
| `npm run verify` | **PASS** — format, lint, typecheck, tests, web build, secret scan, import boundaries; dependency audit reported as the known advisory (18 vulnerabilities, unchanged, B-5) |
| `npm run check:responsive` | **NOT RUN** — Chromium/Playwright unavailable in this VM (unchanged, as in TASK-008G) |
| Live Cloudinary upload | **NOT RUN** — no credentials, and no live provider call is made by automated tests |

### What the new tests pin

1. Signed parameter names are exactly `folder`, `overwrite`, `public_id`,
   `timestamp`; `resource_type` and every excluded field are absent.
2. Submitted fields are exactly those four plus `api_key` and `signature`;
   `resource_type`, `unique_filename` and `cloud_name` are absent.
3. The signature equals SHA-1 of
   `folder=…&overwrite=false&public_id=…&timestamp=…<secret>`.
4. Changing `folder`, `public_id`, `timestamp` or `overwrite` changes the
   signature.
5. The URL stays `…/v1_1/<cloud>/image/upload` (resource type in the path, never
   a field).
6. Wire level: the `FormData` handed to `fetch` has exactly
   `api_key, file, folder, overwrite, public_id, signature, timestamp`, sends
   `overwrite=false`, and its `signature` equals the signature recomputed from
   its own submitted signed fields.
7. Error handling intact: a 401 still becomes `MediaProviderFailure`
   (`provider_status`, status 401, `internal_error`), and a foreign
   `secure_url` still becomes `invalid_url`.
8. The returned `publicId` still equals the submitted `public_id`.

## 5. Privacy / security review

- No secret, key, cloud name or signature value is logged, returned or
  committed; `CLOUDINARY_*` values are read from the environment as before and
  were not modified.
- The signature input and body were reviewed for secret exposure: the API secret
  is only hashed, never sent.
- No new dependency, no new endpoint, no auth/authorization change, no CSRF or
  rate-limit change, no schema or migration change.
- The upload still rejects foreign `secure_url` values, so a compromised or
  mis-set provider cannot redirect persisted media.

## 6. Known limitations

1. **No live-provider proof.** The tests prove the request we build, not that a
   real Cloudinary environment accepts it. Mocked success is not evidence of a
   successful upload, and none is claimed here.
2. **Owner Preview verification is required**, and needs a deployment of this
   branch (not performed — deployment requires separate authorization).
3. `check:responsive` remains unavailable in this VM.

## 7. Owner Preview verification (after a deployment is authorized)

1. Deploy `task/TASK-008H-cloudinary-signed-upload-correction` to Preview only,
   with the existing Preview variables unchanged
   (`MEDIA_PROVIDER_ADAPTER=cloudinary`, `CLOUDINARY_CLOUD_NAME`,
   `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
2. Sign in, open `/compose`, choose one small JPEG/PNG/WebP, publish.
3. Expected: the photo appears on the feed and the post persists after reload.
4. If it still fails, copy the composer's `[synergy-upload]` line and the
   `x-upload-request-id`, then find the matching `post_media_upload` event in
   the Vercel runtime logs. `provider_failed` with `provider_reason:
   provider_status` and `provider_status: 401` would mean the provider still
   rejects authentication — stop and report rather than changing credentials.
5. Do not change Production, credentials or Preview variables as part of this
   check.

## 8. Next agent instructions

- Do not claim the 401 is fixed until an owner Preview upload succeeds; the
  local evidence only proves the request now matches Cloudinary's documented
  signing rule.
- If the Preview still returns 401, first confirm the deployment actually
  contains `8d45597` (or later on this branch), then re-read §1 before proposing
  changes. Do not "fix" this by disabling signature checks, switching to an
  unsigned preset, or altering credentials without explicit owner authorization.
- Remaining work on this line: owner acceptance of TASK-008A/B/C/D/G and this
  task; TASK-008E/following-feed acceptance items stay outside this branch.
- Nothing here authorizes a merge, a Production promotion, or work on other
  task branches.
