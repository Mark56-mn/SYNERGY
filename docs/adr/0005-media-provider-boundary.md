ADR-0005 — Media provider boundary (MediaProvider interface)

Status: RECOMMENDED (pending owner approval)

Context
SYNERGY needs media support (upload, processing, storage, delivery, moderation status). The approved direction is Cloudinary initially, behind a media-provider adapter (SYSTEM_ARCHITECTURE.md). The adapter requirement exists to avoid vendor lock-in and to make tests possible without credentials. The product also has confirmed media limits: listing media up to 3 pictures + 2 videos (D-007); short video ≤ 3 min, standard ≤ 10 min, long ≤ 30 min (D-008); live streaming deferred (MVP_SCOPE.md deferred list).

Constraints from approved documents
- SYSTEM_ARCHITECTURE.md: provider adapters for media (and auth/notifications/payments) to avoid vendor lock-in; Cloudinary initially.
- MASTER_BLUEPRINT.md: video is a major capability; quality options and adaptive delivery later; no live streaming until moderation/operations ready.
- MVP_SCOPE.md: video pipeline only when media costs and processing are controlled; upload/retention limits and cost alerts; Cloudinary behind an adapter.
- SECURITY_RULES.md: file type/size validation, ownership, processing failures, access controls and cost limits; signed/secure uploads; never trust client-supplied media metadata as truth.
- SECURITY_RULES.md: structured logs with sensitive values redacted; no production secrets in repo/client/logs.
- SECURITY_RULES.md: do not claim working media behaviour that has not been validated.

Requirements the interface must express
- Request upload authorisation (the caller is permitted to upload for this resource).
- Signed/secure upload (not raw client-to-provider upload without server control, where the provider supports it — Cloudinary signed uploads are the natural fit; the interface should support that).
- Asset record (who uploaded, for which resource, media type, intended use, transforms/derivatives needed, moderation status).
- Processing/moderation status (pending, ok, flagged, rejected, failure) — not a blend with delivery.
- Delivery URL with transforms (resizing, format, quality) — the delivery path, not the upload path.
- Limits enforcement: listing media cap (3 pictures / 2 videos) and video length caps (3/10/30 min) are enforced at the boundary, not only in the UI.
- A local stub adapter so tests need no Cloudinary credentials — tests must be runnable without provisioning.

Decision
RECOMMENDED: introduce a `MediaProvider` interface with two implementations: a Cloudinary adapter and a local stub adapter. The rest of the system talks only to the interface. Upload, asset, processing/moderation status and delivery are separate concerns in the interface and in the application state.

Interface contract, plainly stated
1. Authorise an upload request (server-side check that the caller may attach media to the target resource).
2. Obtain a signed/provider-controlled upload mechanism from the adapter.
3. On upload completion, record an asset entry: owner, target resource, media type, intended use, upload/reference, transforms, and a moderation status initialised to pending.
4. Derivation/transformation and moderation are separate steps; delivery is guarded by both the asset record and the moderation/ownership state.
5. Listing-bound media is capped (3 pictures / 2 videos); video length is bounded (≤ 3 / ≤ 10 / ≤ 30 min) at upload/processing time, not only at the UI.
6. The stub adapter implements the same interface using local/temporary storage and fake signed uploads so integration/acceptance tests run without credentials.

Why Cloudinary stays behind an adapter
- So provider choice is replaceable (SYSTEM_ARCHITECTURE.md).
- So tests and CI-free local development do not require real credentials (QUALITY_GATES.md-style local development; G-2 provisioning is a separate owner action).
- So cost controls and upload/retention limits are enforced in application logic, not assumed from the provider.

Security and cost impact
- Security: file type/size validation, ownership, and access control are the controls; signed uploads reduce the chance of unauthorised uploads. Moderation status gates delivery. Uploads are a classic abuse surface, so rate limits and validation apply (SECURITY_RULES.md: rate-limit uploads; never trust client-supplied metadata).
- Cost: video is the dominant variable cost once video starts. The interface supports cost controls (caps, transforms, retention) in application logic; the cost proposal must present free-tier/limits and what triggers paid usage. Do not treat Cloudinary free tier as unbounded.

Open dependencies
- D-05 (Cloudinary provisioning is an owner action, gate G-2) — the adapter exists before provisioning so the system is testable without it, but real media requires the owner-created free-tier development project.
- Video pipeline MVP timing: only when media costs/processing are controlled — so the upload/asset/moderation/adapter foundation can exist before video is enabled, consistent with MVP_SCOPE.md.
- Moderation/Trust-and-safety integration: asset moderation status is a seam for the reporting/blocking/moderation foundations (MVP roadmap item 11). This ADR defines the seam; the moderation logic is a separate concern.
