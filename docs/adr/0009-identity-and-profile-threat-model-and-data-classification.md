ADR-0009 — Threat model and data classification for the identity/profile slice

Status: RECOMMENDED (pending owner approval)

Scope of this document
This is the threat model and data classification for the identity and profile slice only: sign-up/sign-in/recovery, session, profile ownership, profile visibility/privacy, and the initial protected profile and content endpoints. It is written now because those controls are foundational and because `ADR-0003` requires a written test matrix for the initial protected resources. It does not cover every later domain; later domains get their own threat reviews as they are planned.

Relevant approved constraints
- `SECURITY_RULES.md`: enforce authorisation on the server/data layer for every protected resource; explicit ownership and role checks; least privilege; parameterised queries; never trust client-supplied roles; rate-limit auth and other abuse-prone endpoints; redact sensitive values from logs; test cross-user access denial; add negative tests for unauthorised access and malformed input.
- `ADR-0003`: Supabase Auth is the identity authority; authorisation is service-layer deny-by-default with ownership/role checks; RLS on Neon only supplementary and only where the JWT/claim path is verified; per-protected-resource negative tests required.
- `MASTER_BLUEPRINT.md`: email is the initial registration/recovery anchor; phone verification is optional initially and may be required for sensitive actions; phone verification alone is not proof of one human.
- `QUALITY_GATES.md`: auth tests include valid/invalid credentials, session lifecycle, rate limits, recovery, and server-side authorisation.

Assets
- Supabase Auth account/session for a user.
- The `supabase_user_id` (UUID) that links Supabase Auth to the in-app profile.
- The profile row and its visibility/privacy fields.
- Profile media and other owned content reachable through the profile.
- Auth tokens/cookies used for session state server-side.
- Logs and telemetry that could contain identifiers or sensitive values if not redacted.

Actors
- Legitimate user — the account owner and other entitled callers.
- Unauthenticated attacker / anonymous web client.
- Account-taker — someone trying to take over or impersonate an account.
- Enumerator — someone trying to discover usernames/profiles/IDs or probe visibility.
- Privileged staff — moderator/support and admin/security operators with least-privilege tooling.

Trust boundaries
- Untrusted: client input, client-supplied profile/private-field toggles as “truth”, client-supplied identifiers in URLs/parameters, client session claims that have not been verified server-side.
- Trusted internal: server-side session verification, authorisation helpers, DB client, provider adapters when used server-side.
- Identity authority: Supabase Auth is trusted for authentication/identity; session verification is server-side.

Top threats and mitigations

1. Account takeover
- Threat: an attacker gains control of an account through credential/session compromise, recovery abuse, or session fixation-style misuse.
- Mitigations: server-side session verification from Supabase Auth; least-privilege session handling; recovery path designed and rate-limited; sensitive actions may require extra verification where the product later specifies it; staff/admin access is least-privilege and audited; logs redact tokens/secrets.
- Note: Supabase Auth is the identity authority, so the app does not invent its own password store or weaken Supabase Auth’s model.

2. IDOR / BOLA (horizontal privilege escalation)
- Threat: a caller acts on another user’s profile/content/resource by supplying another user’s identifier.
- Mitigations: every protected operation asserts ownership/role before touching data; parameterised queries; caller identity comes from the verified session, not from client-supplied IDs; visibility enforced at read time.
- This is the main control theme of `ADR-0003` and the main reason this threat model exists.

3. Private-profile leakage
- Threat: private profile fields or private content are exposed to someone not entitled to see them, including through search, previews, feeds, caches, or API shape.
- Mitigations: visibility/privacy enforced at read time in services; private fields/item excluded from responses for non-entitled callers; error messages and API shapes do not reveal whether something exists vs is hidden; caches/feeds/search respect visibility.
- This is both an authz control and a privacy control.

4. Enumeration and discovery abuse
- Threat: an attacker enumerates accounts, profiles, or resource IDs, or probes which profiles are private.
- Mitigations: rate-limit auth and other abuse-prone endpoints; avoid distinct error shapes that disclose existence where practical; do not leak private data through public surfaces; be careful with ID/obfuscation choices so obfuscation is not mistaken for access control.
- Important nuance: obfuscation is not a substitute for authorisation.

5. Session/session-lifecycle abuse
- Threat: stale/revoked/forged sessions are used after they should be invalid.
- Mitigations: server-side verification of the Supabase Auth session before protected work; honour session lifecycle/revocation where Supabase Auth supports it; tests cover session lifecycle where relevant.

6. Logging and operational leakage
- Threat: sensitive identifiers, tokens, private messages, or other sensitive values end up in logs or telemetry.
- Mitigations: structured logs with sensitive values redacted; no secrets in logs; staff access to logs/tools is least-privilege and auditable.

7. Malformed/untrusted input
- Threat: malformed or unexpected input causes errors, unintended behaviour, or bypasses.
- Mitigations: validate and normalise untrusted input; parameterised queries; never trust client-supplied metadata/roles/ids; negative tests for malformed input.

Data classification (identity/profile slice)
- Public profile data — data intentionally shown to other users according to visibility settings. Still subject to the visible/separate ranking and privacy rules; public does not mean “free to enumerate or misuse”.
- Private profile data — fields only entitled callers may see. Must never leak through search/preview/feed/cache/API shape.
- Authentication/session material — tokens/keys/session verification details. Server-side; redacted from logs; never committed.
- Protected content owned by a user — content whose read/write access is owner-scoped or visibility-scoped. Treated as protected resources in the negative-test matrix.
- Audit/operational data — records of sensitive/privileged actions. Least-privilege access; auditLog where required.

Negative tests that MUST exist for the initial protected resources
These are named so the identity/profile task and TASK-005 can implement them; they are not claims that tests already pass.

For profiles:
- User A can read and update User A’s own profile.
- User A cannot read User B’s private profile fields.
- User A cannot infer User B’s private fields from API shape or error differences.
- User A cannot update User B’s profile at all (server-side denial).
- Unauthenticated requests to protected profile endpoints are denied.
- Session invalidation/revocation stops further access where Supabase Auth supports it.

For owned content (MVP text/image first):
- User A can create/read/update/delete their own content.
- User A cannot create/update/delete User B’s content.
- Visibility rules are enforced at read time; a private item is never returned to a non-entitled caller, including via search, feeds, or caches.

For the follow graph:
- Follow/unfollow is owner-scoped; you cannot mutate someone else’s connections.
- Follow visibility settings are honoured when feeds/listings are built.

For future money-related paths (DEFERRED — control shape only, no implementation):
- Append-only, auditable double-entry ledger; no mutable balance as sole source of truth.
- Idempotency, signed webhook verification, reconciliation, refund/dispute handling, beneficiary verification, strict access controls.

Security and cost impact
- Security: this is the foundational threat model. The dominant risks in this slice are account takeover and horizontal privilege escalation; the mitigation shape is server-side verification, deny-by-default ownership/role checks, parameterised queries, visibility-at-read, rate limits, and redacted logs.
- Cost: no direct cost. The cost is engineering discipline and the negative tests named above.

Open dependencies
- `ADR-0003` for the authorisation model this threat model is built on.
- `ADR-0001` and `ADR-0006` for the server/client boundary that makes server-side verification enforceable.
- `ADR-0008` for the test runner/secret-scan tooling that supports the negative tests and secret checks.
- The identity/profile task file created in the Phase 1 breakdown for the concrete implementation scope.
