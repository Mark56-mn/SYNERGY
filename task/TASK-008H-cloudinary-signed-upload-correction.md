# TASK-008H — Cloudinary signed-upload correction

- **Status:** IMPLEMENTED — LOCAL VERIFICATION PASS; OWNER PREVIEW TEST PENDING (see `handoff/TASK-008H.md`)
- **Branch:** `task/TASK-008H-cloudinary-signed-upload-correction`
- **Base:** `task/TASK-008G-preview-image-upload-diagnostics` at `d4d77d49f24954e93e7975334f0811c6e8c04e72`
- **Owner authorization:** explicit request on 2026-11-26 to correct the signing mismatch identified by the TASK-008G diagnosis, on an isolated task branch.
- **Priority:** P0 — blocks owner acceptance of photo publishing.

## 1. Problem statement

Photo publishing on the TASK-008F Preview fails while text-only publishing succeeds. TASK-008G added stage diagnostics; its analysis identified a likely signature mismatch, and the deployed upload returns **HTTP 401 Unauthorized** from Cloudinary.

The request built by `web/src/server/media/image-upload.ts` did not follow Cloudinary's signing rule:

| Field | Before | Cloudinary rule |
|---|---|---|
| `resource_type` | signed **and** sent in the multipart body | excluded from the signature; for the REST API it belongs in the endpoint path (`/image/upload`) |
| `overwrite=false` | sent, **not** signed | must be signed if sent |
| `unique_filename=true` | sent, **not** signed, and unnecessary for the current configuration | must be signed if sent |

Cloudinary rejects any upload whose signature does not match the submitted parameter set, which returns 401 rather than a helpful validation message.

## 2. Official documentation consulted

- `https://cloudinary.com/documentation/upload_images` (step 4): generate a signature over **all** request parameters including `timestamp` and any optional parameters, **excluding `api_key`, `resource_type`, `cloud_name` and `file`**.
- `https://cloudinary.com/documentation/authentication_signatures`: SHA-1 (or SHA-256) digest; SDKs default to SHA-1.
- `https://cloudinary.com/documentation/image_upload_api_reference_upload`: `resource_type` is "only relevant as a parameter when using the SDKs — the `resource_type` is included in the endpoint URL when using the REST API".

## 3. Goal

Make the signed parameter set and the submitted multipart fields identical, excluding only the four fields Cloudinary excludes, and keep the resource type in the URL path.

## 4. Authorized scope

- Work only on this branch.
- Correct the signature parameter construction in the shared image-upload helper.
- Keep `resource_type` in the upload URL path only.
- Include `overwrite=false` in both the signature and the multipart body.
- Remove `unique_filename` from the multipart body (`use_filename` is not used, so it has no effect).
- Preserve the existing folder and public-ID behaviour and the existing error classification and user-facing messages.
- Add regression tests over the exact signature input and the exact multipart fields.
- Update `task/` and `handoff/` documentation.

## 5. Expected and implemented parameter sets

Signed parameters (alphabetical canonical order used for the signing string):

```
folder=<folder>&overwrite=false&public_id=<publicId>&timestamp=<unixSeconds><apiSecret>
```

Multipart fields: `file`, `api_key`, `signature`, plus every signed parameter
(`folder`, `overwrite`, `public_id`, `timestamp`). Nothing else.

Upload URL: `https://api.cloudinary.com/v1_1/<cloudName>/image/upload` —
the resource type is the `image` path segment and is never a field.

## 6. Non-goals / forbidden changes

- No Production deployment, Production variables, Vercel settings or Cloudinary account changes.
- No credential or environment-variable changes; no secrets printed, requested or committed.
- No database schema, migration, authentication or unrelated media changes.
- No change to TASK-008G or other task branches; no merge, rebase or force push.
- No GitHub Actions workflow.
- No live Cloudinary call in automated tests.

## 7. Acceptance criteria

- [x] AC1 — `resource_type` is absent from the signed parameters.
- [x] AC2 — `resource_type` is absent from the multipart form fields.
- [x] AC3 — `overwrite=false` is present in both the signature input and the multipart fields.
- [x] AC4 — `unique_filename` is not submitted.
- [x] AC5 — The signature changes when any signed parameter changes.
- [x] AC6 — The signing string is alphabetical, `&`-joined, with the API secret appended, SHA-1 hex encoded.
- [x] AC7 — Signed parameters and submitted fields cannot drift: the fields are derived from the signed set.
- [x] AC8 — The upload URL keeps `image` in the path and no resource-type field is sent.
- [x] AC9 — Folder and public-ID behaviour is unchanged.
- [x] AC10 — Existing success and failure behaviour is unchanged (verified `secure_url`, `MediaProviderFailure` classes, no secret in messages).
- [x] AC11 — Focused tests and the full local verification suite pass.

## 8. Test plan

- New `tests/cloudinary-signed-upload.test.ts` covering AC1–AC10, including a
  wire-level assertion over the `FormData` body passed to `fetch`: the field
  set, the absence of `resource_type`/`unique_filename`, and that the submitted
  signature equals the signature recomputed from the submitted signed fields.
- Updated the pre-existing avatar signature expectation in
  `tests/avatar-upload.test.ts` to the corrected parameter set.
- `npx vitest run` focused suites, then `npm run verify` for the aggregate gate.

## 9. Risks and limitations

- Mocked tests prove the request we build, **not** that a live Cloudinary
  environment accepts it. Only an owner Preview upload can confirm the 401 is
  gone.
- The diagnostics from TASK-008G are unchanged and still report
  `provider_status` with the provider HTTP status, so a remaining failure stays
  classifiable without new instrumentation.
