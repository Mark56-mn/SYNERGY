# SYNERGY Security and Privacy Rules

## Non-negotiable
- Never commit credentials, API keys, access tokens, private keys, connection strings or production data.
- Keep secrets server-side in approved secret managers/environment configuration.
- Use least privilege and separate dev/staging/prod credentials.
- Enforce authorization on the server/data layer for every protected resource.
- Validate and normalise untrusted input; use parameterised queries.
- Rate-limit authentication, messaging, uploads, search and other abuse-prone endpoints.
- Use secure session handling, secure password/auth provider configuration and MFA for privileged staff where supported.
- Redact tokens, passwords, private messages and sensitive personal information from logs.
- Encrypt data in transit; assess encryption at rest and key management for sensitive stores.
- Define retention, deletion, export and backup handling.
- Add audit logs for privileged and sensitive actions.
- Protect against CSRF, XSS, injection, SSRF, IDOR/BOLA, unsafe uploads and mass assignment as relevant to the stack.

## Privacy
- Collect the minimum data needed for a stated purpose.
- Do not sell private messages, contacts or sensitive personal information.
- Do not expose private profiles/content through search, previews, API responses or caches.
- Ad targeting is coarse geography only; no precise GPS, private address or neighbourhood targeting.
- Advertisers receive aggregate reporting, not viewer identities.
- Do not promise anonymity or untraceability.
- Implement block/report/mute/restrict controls with consistent enforcement across surfaces.

## Money movement (deferred)
Before any real payment feature: regulated provider review, KYC/KYB, signed webhook verification, idempotency, append-only double-entry ledger, reconciliation, refund/chargeback/dispute workflow, beneficiary verification, transaction limits and audit trail. Never treat a mutable balance field as the only financial source of truth. Never call a feature escrow without legal/provider confirmation.

## Database and API
- Test cross-user access denial.
- Enforce row-level/data access policies where applicable.
- Use safe migrations and documented recovery.
- Never disable a security control merely to make a test pass.
- Add negative tests for unauthorised access and malformed input.

## Incident handling
If a secret is exposed or a security/privacy incident is suspected: stop, do not repeat the secret, document the exposure without copying its value, notify the human owner and recommend rotation/containment. Do not independently rotate production credentials or make public statements.

## Legal review
The project requires qualified review of Nigerian NDPA 2023/NDPC, consumer protection, payments, tax, advertising, IP and marketplace obligations before launch. Agents must not claim legal compliance based solely on code or this document.
