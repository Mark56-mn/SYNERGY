# TASK-008G — Preview image-upload diagnostics — handoff

- **Status:** DONE — implementation and local verification complete; owner Preview test and results interpretation pending.
- **Branch:** `task/TASK-008G-preview-image-upload-diagnostics`
- **Base branch:** `task/TASK-008F-preview-deployment-and-posting-verification`
- **Base commit:** `9ef8a66a29b4252a4434d5c49b66abfe5a142653`
- **Implementation commit:** `2e9086c` (code + tests); this handoff is the documentation commit immediately after it.
- **Owner authorization:** 2026-11-23 — owner approved a separate-branch diagnostic implementation after the read-only investigation.
- **Deployment:** none. No Preview deployment was requested or performed by this task (§10 requires separate explicit authorization).

## 1. What was wrong

`POST /api/v1/posts/media-upload` collapsed every provider outcome into one
`internal_error` / 500 ("Something went wrong. Please try again later."), and
the composer turned every thrown fetch into the same "Network problem — your
post was not published." message. Nothing correlated a browser failure with a
server log line, so it was impossible to tell apart: request never arrived,
auth/CSRF/validation rejection, missing Cloudinary configuration, provider
network failure, provider non-2xx, malformed provider body, or a client-side
response-shape problem.

## 2. What was implemented

### Server (all in the existing style, no new dependencies)

| File | Change |
|---|---|
| `web/src/server/media/upload-diagnostics.ts` (new) | `UploadStage` model, allow-listed field filter, `newUploadRequestId()` (`randomUUID`), `sizeBucketFor()`, `mimeCategory()`, `logUploadStage()`, `UPLOAD_REQUEST_ID_HEADER = x-upload-request-id`, stable event name `post_media_upload`. |
| `web/src/server/media/image-upload.ts` | Adds `ProviderFailureReason` (`network`, `timeout`, `provider_status`, `malformed_response`, `invalid_url`) and `MediaProviderFailure extends AppError`. `uploadImageToCloudinary` now throws that classified error instead of the opaque `internalError()`. Because it is still an `AppError` with code `internal_error` and the same safe message, every caller keeps the identical status, body and wording. |
| `web/src/server/http/errors.ts` | `AppError` accepts optional `responseHeaders` (opaque correlation ids only). |
| `web/src/server/http/handler.ts` | Merges `error.responseHeaders` into the JSON error response. No behaviour change when absent. |
| `web/src/app/api/v1/posts/media-upload/route.ts` | Emits `received → [origin_rejected \| auth_denied] → authorized → [config_missing \| config_present] → [body_unreadable \| file_missing \| validation_failed \| validation_passed] → provider_started → [provider_succeeded → completed \| provider_failed]`, returns `x-upload-request-id` on success, 503 and every thrown error, and re-throws the same code/message it always did. |

### Client

| File | Change |
|---|---|
| `web/src/lib/upload-diagnostics.ts` (new) | `logUploadDiagnostic()` writes one copyable `[synergy-upload] {...}` console line, plus `readUploadRequestId()` which accepts only a UUID-shaped header value. |
| `web/src/components/compose/PostStudio.tsx` | `uploadPhoto()` classifies `fetch_rejected`, `unauthorized`, `http_error` (+status), `parse_failed`, `missing_media_url`, `succeeded`, all with the request id and elapsed ms. User-facing messages, draft handling, retry-free behaviour and the publishing contract are unchanged. |

### Stage/field allow-list

Fields actually emitted: `stage`, `request_id`, `http_status`, `duration_ms`,
`mime_category` (`jpeg`/`png`/`webp`), `size_bucket`, `config_present`,
`provider_status`, `provider_reason`.

`upload-diagnostics.ts` drops any key not on that list and drops any string
value that is not a short `[a-z0-9_.:-]` token, so a URL, filename, caption or
credential cannot be logged even by a future mistake. Key names were chosen to
avoid the existing logger's sensitive-key redaction (`*code*`, `*token*`,
`*secret*`, `*session*`), so a classified failure is not silently blanked out.

## 3. Privacy review

Not logged or returned anywhere: Cloudinary cloud name, API key, API secret,
signature, signed parameters, authorization headers, cookies, Supabase tokens,
environment values, image bytes, original filename, caption, post body, full
Cloudinary URL, email, user id, IP address.

Verified by test rather than by inspection: `tests/post-media-diagnostics.test.ts`
injects sentinel cloud name, API key, API secret, filename, the member UUID and
the bearer token, then asserts that none of them — and no `https://`,
`res.cloudinary.com` or `photo.png` fragment — appears in captured output.
`tests/compose.test.tsx` asserts the browser lines never contain the file name
or the caption.

The only value added to a response is the opaque `x-upload-request-id` UUID;
error bodies, status codes and messages are byte-identical to before.

## 4. Tests and exact results

Focused first, then every available gate, in the worktree at the implementation commit:

| Command | Result |
|---|---|
| `npx vitest run tests/post-media-diagnostics.test.ts tests/post-media-route.test.ts tests/compose.test.tsx tests/avatar-upload.test.ts` | PASS — 4 files / 41 tests |
| `npm run format:check` | PASS — all files match Prettier |
| `npm run lint` | PASS (exit 0) |
| `npm run typecheck` | PASS — web + android (exit 0) |
| `npm test` | PASS — 35 files / 297 tests |
| `npm run build` | PASS — Next production build, exit 0 |
| `npm run secret-scan` | PASS — clean, 288 tracked files |
| `npm run check:boundaries` | PASS — clean, 110 files |
| `npm run verify` | Not run as an aggregate; every gate it wraps was run individually above with the same commands and all passed. |
| `npm audit` | Not run by this task; unchanged triage is B-5 in `handoff/TASK-005.md` §6. |
| Live Cloudinary upload | **NOT RUN** — by design (§9: no live provider call in automated tests, no credentials). |

New coverage: success stage sequence and header; auth denial; cross-origin
rejection; missing configuration (503 contract intact); validation failure with
no provider call; provider network and provider-status failures; direct
`uploadImageToCloudinary` classification of `network`, `timeout`,
`provider_status`, `malformed_response`, `invalid_url` and success; client
`fetch_rejected`, `http_error` + request id, `parse_failed`,
`missing_media_url`, `succeeded`; redaction sentinels on both sides.

Existing tests for the route, composer and avatar upload were not modified and
still pass, which is the evidence that the response contract and the avatar
flow's behaviour are unchanged.

## 5. Known limitations / risks

1. **429 rate-limit rejections have no request id.** The limiter runs in the
   shared route wrapper before this handler, so those responses carry no
   `x-upload-request-id` and emit no stage line. A client `http_error` with
   status 429 and no id is therefore expected and self-explanatory.
2. **`timeout` is classified, not created.** No new abort/timeout budget was
   added (§6 forbids changing upload semantics), so a hung Cloudinary call is
   still bounded only by the platform function timeout; a platform abort is
   classified as `timeout` when it happens.
3. **No live-provider proof.** The tests use deterministic doubles. They prove
   classification, correlation and redaction, not that Cloudinary accepts the
   request.
4. **Deployment still required** before these diagnostics exist on the Preview;
   the currently deployed SHA `9ef8a66` does not contain them.

## 6. Owner Preview verification (one attempt, after deployment)

1. Open `/compose` on the Preview signed in, add a short caption and one small
   ordinary JPEG/PNG/WebP photo, and press **Publish post** exactly once.
2. If it fails, copy the `[synergy-upload] {...}` line from the browser console
   and, for an HTTP error, the `x-upload-request-id` value from the response in
   DevTools → Network.
3. In Vercel → the Preview deployment → Logs, search for `post_media_upload`
   and that `request_id`. The last stage before the gap is the failing stage,
   and `provider_reason` separates Cloudinary rejection from network/malformed
   response/invalid URL.
4. Before any retry, check the feed and Cloudinary for a partially created post
   or upload — the composer never retries automatically.

Interpretation shortcut: `received` with no `authorized` → session/CSRF;
`config_missing` → Preview variables; `validation_failed` → the file itself;
`provider_failed` → read `provider_reason`/`provider_status`; `completed` in
the server log but a browser `fetch_rejected`/`parse_failed` → network path,
proxy or response handling, not Cloudinary.

## 7. Next action

Request separate explicit owner authorization to deploy this branch to the
Vercel **Preview** only, verify the deployment's READY state and exact SHA
`2e9086c`, then perform the single controlled image-post attempt in §6 and
record the correlated stages. Production, `main`, merges, TASK-008D acceptance,
schema, credentials and provider settings remain untouched and unauthorized.
