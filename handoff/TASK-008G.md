# TASK-008G — Preview image-upload diagnostics — handoff

- **Status:** APPROVED — IMPLEMENTATION AUTHORIZED; NOT STARTED
- **Branch:** `task/TASK-008G-preview-image-upload-diagnostics`
- **Base branch:** `task/TASK-008F-preview-deployment-and-posting-verification`
- **Base commit:** `9ef8a66a29b4252a4434d5c49b66abfe5a142653`
- **Owner authorization:** 2026-11-23 — owner approved a separate-branch diagnostic implementation after the read-only investigation.

## Objective

Instrument the image upload path with minimal safe diagnostics to find why image posts show “Network problem — your post was not published” while text-only publishing succeeds.

## Known baseline

- Preview deployment: `https://synergy-gy27aze6y-drop2.vercel.app`
- Deployment ID: `dpl_3SyQSCXqafrYXpSSSw8RoPSJawGF`
- Deployed commit: `9ef8a66a29b4252a4434d5c49b66abfe5a142653`
- Deployment status: READY (Preview).
- Preview `MEDIA_PROVIDER_ADAPTER` was set to `cloudinary`; the image-post error persisted.
- Production variable was not changed.
- Endpoint exists: `POST /api/v1/posts/media-upload`.
- Route validates same-origin, session, multipart file, image type/bytes/dimensions and uses the Cloudinary helper when configured.
- Cloudinary helper maps provider/network failures to a generic application error. Current logs did not establish whether the request reached the route or provider.
- Owner has confirmed text-only posts can be published. Do not ask for repeated image retries before inspecting evidence.

## Instructions to the implementing agent

1. Read `AGENTS.md`, all applicable source-of-truth documents, `handoff/CURRENT_STATUS.md`, this handoff, and `task/TASK-008G-preview-image-upload-diagnostics.md`.
2. Inspect branch state and exact source call graph before editing. Search for `/api/v1/posts/media-upload` to find the browser caller.
3. Implement only the approved diagnostics. Prefer the existing redacting logger; do not add telemetry vendors, dependencies, database objects, migrations, or secrets.
4. Add a safe correlation ID and stage/error classification. Keep log fields allow-listed; never log raw exceptions or request/provider payloads.
5. Cover server and client boundaries with deterministic tests. Preserve the existing generic user-facing error message and publishing behavior.
6. Run focused tests and all available repo quality gates. Record exact commands and outcomes.
7. Do not deploy. A Preview deployment requires separate explicit owner authorization.
8. Update `handoff/CURRENT_STATUS.md` and this file when the implementation is genuinely DONE or BLOCKED. Include the next action so another agent can resume without asking the owner to repeat context.

## Privacy checklist

- Never log tokens, cookies, API keys/secrets, signatures, cloud name, raw provider messages/bodies, full URLs, image bytes, filenames, captions, user IDs, emails or IP addresses.
- Safe fields may include opaque request ID, fixed stage/error code, HTTP status, elapsed time, content type, MIME category, size bucket, config-presence booleans and sanitized provider error codes.
- Verify redaction through tests that deliberately inject sentinel secret strings and assert they never appear in captured logs/output.

## Scope boundary

Preview diagnostics only. No Production, main, merge, TASK-008D, database/schema, credentials, provider configuration, authentication architecture, retry behavior, unrelated UI, or other repository changes.

## Next action

Implement TASK-008G on this branch, test it, and return the exact commit and evidence. Do not deploy until the owner separately approves Preview deployment.
