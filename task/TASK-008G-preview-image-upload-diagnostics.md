# TASK-008G — Preview image-upload diagnostics

- **Status:** IMPLEMENTED — LOCAL VERIFICATION PASS; OWNER PREVIEW TEST PENDING (see `handoff/TASK-008G.md`)
- **Branch:** `task/TASK-008G-preview-image-upload-diagnostics`
- **Base:** `task/TASK-008F-preview-deployment-and-posting-verification` at `9ef8a66a29b4252a4434d5c49b66abfe5a142653`
- **Owner authorization:** Explicit approval on 2026-11-23 to implement the previously proposed Preview image-upload diagnostics on a separate TASK branch.
- **Priority:** P0 — blocks owner acceptance of photo publishing.

## 1. Problem statement

On the TASK-008F Vercel Preview, the owner can sign in, view the feed, like videos, and publish text-only posts. Publishing a post with an image repeatedly shows:

> Network problem — your post was not published.

The same failure persisted after the Preview-only `MEDIA_PROVIDER_ADAPTER=cloudinary` setting was applied and a READY deployment was created. The exact failing stage is unknown. The route exists at `POST /api/v1/posts/media-upload`; it validates the image, authenticates the request, calls Cloudinary and returns JSON containing `mediaUrl`. Server-side Cloudinary failures are currently collapsed into a generic error, and the available Vercel runtime-log sample did not prove whether this upload request reached the route.

Do not assume Cloudinary is the cause. The task is to collect enough safe evidence to distinguish browser/network failure, route/config/auth/validation failure, Cloudinary rejection/timeout, and response handling failure.

## 2. Goal

Add minimal, privacy-safe, correlated diagnostics to the image-upload flow so one owner test on the Preview can identify the last successful stage and the actual failure class, without exposing secrets or user content.

## 3. Authorized scope

- Work only on this branch.
- Inspect the current route, Cloudinary helper, API wrapper/logger, and the client-side image-upload caller before editing.
- Add structured, redacted server diagnostics at meaningful upload stages and failure boundaries.
- Add bounded client-side diagnostics only where needed to distinguish fetch rejection, non-2xx response, invalid JSON, and missing/invalid `mediaUrl`.
- Use a server-generated opaque request/correlation ID. Return it in a response header and/or safe error metadata where practical so the owner can correlate browser and Vercel logs.
- Preserve existing API contracts and user-facing wording unless a contract defect is proven and the smallest compatible correction is necessary.
- Add focused unit/integration tests for success and each observable failure class.
- Document exact Preview test steps and how to find the correlated Vercel log events.

## 4. Required stage model

Use stable, low-cardinality event names or equivalent fields. At minimum distinguish:

1. route entered / request received;
2. session/authentication passed or denied;
3. multipart file present and image validation passed or failed;
4. Cloudinary configuration present or missing (log names/presence only, never values);
5. provider upload started;
6. provider upload succeeded or failed, distinguishing timeout/network, non-2xx provider response, malformed provider response, and invalid returned URL;
7. route response status and completion;
8. client fetch rejected before receiving a response;
9. client received non-2xx response;
10. client response JSON parse failed or successful JSON lacked a valid `mediaUrl`.

Do not emit an event for every internal function call. Keep instrumentation focused, deterministic and low-noise.

## 5. Strict privacy and security requirements

Never log or expose:
- Cloudinary cloud name, API key, API secret, signatures, signed parameters, authorization headers, cookies, Supabase tokens, or environment variable values;
- image bytes/base64, original filename, caption, post body, full Cloudinary URL, or user-supplied metadata;
- email, user ID, IP address, or other personal identifiers.

Allowed diagnostic fields, when useful:
- opaque request ID;
- fixed event/stage/error code;
- HTTP status code;
- elapsed duration in milliseconds;
- validated MIME category and byte-count bucket (not raw file contents);
- boolean configuration-presence flags;
- provider response status and a sanitized, allow-listed provider error code (never raw provider body/message);
- response content type and whether a required field is present.

Do not log raw exceptions, request/response bodies, provider payloads, URLs, stack traces, or arbitrary error messages. Reuse the repository's redacting logger if it can safely support the required structured fields. Do not add a third-party telemetry service, dependency, database table, migration, or paid service.

## 6. Non-goals / forbidden changes

- No Production deployment, Production environment edits, or changes to Production variables.
- No changes to `main`, merges, releases, or acceptance of TASK-008D.
- No database/schema/migration changes.
- No changes to authentication architecture, Supabase settings, Cloudinary account settings, or credentials.
- No change to image upload provider or upload semantics.
- No retries that could duplicate uploads/posts; no automatic post creation.
- No weakening of validation, rate limits, same-origin checks, authorization, or error handling.
- No unrelated composer, feed, profile, design-system, Android, or feature work.
- Do not print secrets or ask the owner to paste secrets into chat.

## 7. Likely implementation areas (verify before editing)

- `web/src/app/api/v1/posts/media-upload/route.ts`
- `web/src/server/media/image-upload.ts`
- `web/src/server/media/cloudinary.ts`
- `web/src/server/http/handler.ts` and existing redacting logger, if needed
- The actual client-side media upload caller and its focused tests (locate by searching for `/api/v1/posts/media-upload`).
- Add or update only the smallest set of tests and task/handoff documentation required.

Do not assume this list is exhaustive; inspect imports and call paths first. Avoid broad refactors.

## 8. Acceptance criteria

- [x] A route-entry event can be identified for every upload request that reaches the handler.
- [x] Every handled failure is classified into a stable safe code and correlated with the request ID.
- [x] Cloudinary rejection, timeout/network failure, malformed response and invalid URL can be distinguished without logging provider secrets or raw payloads.
- [x] Client diagnostics distinguish no response, non-2xx, JSON parse failure and invalid success payload.
- [x] The request ID is safely available for correlating a client failure with server logs when a response exists.
- [x] Existing user-facing generic failure message and upload/post behavior remain unchanged.
- [x] Tests cover successful upload, auth/config/validation failure, provider failure classes, response parsing/shape failure, and privacy redaction.
- [x] No secrets, user identifiers, filenames, image data, captions, raw URLs or raw provider messages appear in captured logs or test output.
- [x] `npm run verify` passes, or every unavailable/failing command is explicitly recorded with evidence and not misrepresented. (Every wrapped gate was run individually and passed; see handoff §4. `npm audit` was not re-run.)
- [x] Diff contains no unrelated files or behavior changes.
- [x] Handoff includes exact changed files, test commands/results, privacy review, and one-step owner Preview verification instructions.

## 9. Test plan

Run the focused route/uploader/client tests first, then the repository gates that are available:
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run verify`
- `npm run secret-scan`
- `npm run check:boundaries`

Use deterministic mocked provider/network responses for tests. Do not make a live Cloudinary upload from automated tests. Do not deploy as part of this task.

## 10. Owner verification (after implementation is independently reviewed)

Only after the branch implementation and tests are ready, request/perform a Preview-only deployment under separate explicit deployment authorization if required. Then the owner should make exactly one controlled image-post attempt using a small, ordinary JPEG/PNG/WebP image and a short caption. Before any retry, inspect the feed and storage/provider evidence for a partial upload/post to avoid duplicates. Correlate the browser result with Vercel logs using the request ID. Do not ask the owner to repeat failed attempts until the first attempt has been investigated.

## 11. Stop conditions

Stop and report rather than expanding scope if:
- the client flow is not the expected route or uses an incompatible contract;
- the safe logger cannot guarantee redaction;
- solving the failure requires credential changes, provider-account changes, paid services, database writes, Production access, or auth/security architecture changes;
- tests reveal a pre-existing blocker outside this task.

## 12. Completion report

Record branch and commit SHA, changed files, exact test commands and outcomes, privacy review, unresolved limitations, whether a deployment was requested (do not deploy), and the next action. Update `handoff/CURRENT_STATUS.md` and `handoff/TASK-008G.md` only after implementation reaches a truthful DONE or BLOCKED state.
