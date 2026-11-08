# TASK-006 — Identity and profile persistence

Status: **TASK-006A PARTIAL (2026-11-08)** — server-side Supabase verification implemented and live-verified for provider reachability (A), connectivity (B) and forged-token rejection (C); positive-path session verification (D) **BLOCKED on B-7b:** the SYNERGY project has zero Auth users and `SUPABASE_TEST_EMAIL` / `SUPABASE_TEST_PASSWORD` are absent from the secret environment. **TASK-006B: BLOCKED — not started.** Implementation record: `handoff/TASK-006.md`.
Branch: `chore/autonomous-foundation-v1`
Planning base: `f58fdfbc4acb8321a0c6b503eacbb15de2ac4823`
Handoff: `handoff/TASK-006.md`

## Objective

Replace the current fictional/demo identity and profile presentation with a real, secure, persisted identity and profile foundation, using the existing application boundaries and confirmed architecture direction. Preserve the web-first delivery order and the separate Expo Android foundation.

This task is deliberately split into two independently reviewable implementation slices:
- **TASK-006A — Identity integration:** connect Supabase Auth to the existing server-side session boundary.
- **TASK-006B — Profile persistence:** create the first Neon schema/migrations and authenticated profile read/update flows, then replace demo profile data only where the real persisted profile is available.

Do not begin either slice until the owner confirms G-2 provisioning and explicitly authorises implementation.

## Authority and constraints

- The 27-section product blueprint remains normative; `DECISION_REGISTER.md` governs decision status.
- Supabase Auth remains the only identity authority. Do not create a second password store.
- Neon remains the primary application database. Do not assume Supabase Postgres helpers such as `auth.uid()` or `auth.jwt()` exist on Neon.
- Verify Supabase access tokens server-side using the supported provider verification mechanism. Never trust browser-supplied user IDs, roles, handles or ownership claims.
- Preserve deny-by-default authorization, parameterised database access, safe errors, redacted logs, rate limits and cross-user isolation.
- Keep development, staging and production credentials isolated. Secrets belong only in approved environment/secret configuration, never source, task files, screenshots, chat or logs.
- Preserve dark navy + mint design tokens and mobile-first responsive behaviour.
- Do not merge to `main`, deploy, provision paid services, enable CI, or change confirmed product rules.
- Do not add Cloudinary upload functionality in this task unless a later approved task explicitly scopes it. Cloudinary is not needed to prove text/profile persistence; retain the existing media-provider boundary.

## G-2 provisioning gate

Before implementation, the owner must create/approve the required free-tier development projects:
1. Supabase project with Auth enabled and email authentication configured.
2. Neon development database.
3. Cloudinary development project, as G-2 explicitly requires all three development projects; no media upload integration is part of this task.

No agent may create accounts, incur costs, select paid tiers, or request secrets in chat. The owner should place credentials directly into the local/builder environment secret store using the exact variable names documented in the repository's `.env.example`. Verify names and configuration without printing secret values.

If any provider's free tier, limits, region, or terms have materially changed, report the constraint rather than selecting a paid option.

## TASK-006A — Identity integration

### Scope
- Inspect the existing `SessionSource`, `SupabaseSessionSource`, env validation and route wrapper before implementation.
- Configure server-only Supabase Auth verification using the approved server-side mechanism and project URL/keys.
- Resolve a verified identity from the incoming request/session; establish secure cookie/session handling consistent with the selected Supabase flow.
- Ensure token validation checks signature/issuer/audience/expiry as applicable through the supported library/provider mechanism; do not hand-roll cryptography.
- Ensure logout invalidates/clears the correct session state.
- Keep all privileged/service-role credentials server-only; prefer the least-privileged viable access.
- Add tests for missing, malformed, expired, invalid-signature, wrong-issuer/audience, revoked/cleared session and valid session cases as supported by the test harness. Never use real user credentials in tests.
- Keep auth endpoints rate-limited and return uniform, non-enumerating error responses.

### Non-goals
- No social login, phone login, MFA product UI, staff/admin role management or account recovery redesign unless already explicitly covered by an approved decision.
- No custom password storage or authentication provider substitution.
- No production auth rollout or public signup launch.

### Acceptance criteria
1. A real server-side Supabase session can be verified in the configured development environment.
2. Unauthenticated, invalid and expired sessions resolve to no authenticated user.
3. No route trusts client-supplied identity or privilege fields.
4. Cookie/session flags and CSRF protections are documented and tested for the chosen flow.
5. Authentication rate limits and safe error behaviour remain active.
6. Automated tests cover positive and negative verification paths without leaking tokens.
7. Existing security-boundary tests remain intact and pass.

## TASK-006B — Profile persistence

### Scope
- Define the minimal user-profile schema required by existing product requirements; avoid inventing optional profile fields or public/private defaults.
- Link the application profile to the immutable Supabase Auth subject ID; never use email or handle as the ownership key.
- Add ordered Drizzle migrations and schema definitions for the minimal profile record.
- Define unique handle constraints and safe normalisation only after checking existing domain contracts and blueprint requirements; document collision handling.
- Implement authenticated profile read/update endpoints and service methods using the verified server session.
- Enforce owner-only writes on the server/data boundary; public profile reads must respect any confirmed privacy requirement. If privacy defaults or profile visibility rules are not explicit in the normative sources, stop and record the decision needed rather than inventing them.
- Validate all input with shared contracts; reject mass assignment of IDs, roles, verification flags, moderation state and timestamps.
- Replace demo profile data only on routes that can safely resolve persisted records; retain clearly labelled demo fallbacks only where necessary and never present fictional data as real.
- Add migration/recovery instructions and test database isolation using separate test identities.

### Non-goals
- No avatar upload or Cloudinary integration, follows, feed publishing, messaging, communities membership, business onboarding, verification, payments or monetisation.
- No destructive migration or production database operation.
- No import of demo identities into a real user database.

### Acceptance criteria
1. A reviewable additive migration creates the minimal profile table and required indexes/constraints.
2. Profile records are linked to verified Supabase subject IDs.
3. Authenticated owners can create/read/update only their own profile fields.
4. Cross-user read/write attempts are denied according to the approved visibility rules.
5. Client-supplied ownership, role, verification and moderation fields are ignored or rejected.
6. Handle uniqueness/collision behaviour is deterministic and tested.
7. Migration forward/recovery steps are documented; no destructive rollback is required.
8. Web profile routes distinguish real persisted records, not-found states and any demo fallback honestly.
9. Android foundation remains type-safe and aligned with shared domain contracts; no claim of completed native release build without the Android toolchain.

## Shared definition of done

- Run `npm run verify`, `npm run check:responsive`, Android typecheck and Android Metro export where applicable.
- Run database migration tests against an isolated development/test database; never test against production.
- Run dependency audit and report existing B-5 advisories separately; do not force major upgrades.
- Review authorization paths, IDOR/BOLA, CSRF, XSS, mass assignment, rate limits, logging redaction, secret scan and import boundaries.
- Record exact commands, versions, exit codes and limitations. Do not claim a gate passed if it was not run.
- Update `handoff/CURRENT_STATUS.md`, `ROADMAP.md`, `handoff/README.md` and a task-specific handoff after each implementation slice.

## Dependencies and blockers

- TASK-003 foundation and TASK-005 quality/security gates: DONE.
- G-2 owner provisioning and environment-secret configuration: BLOCKING.
- Explicit owner release of TASK-006A: REQUIRED before identity integration.
- TASK-006A completion and review: required before TASK-006B.
- B-5 dependency-major decision: remains separate; do not upgrade majors without approval.
- G-5 CI decision: remains unresolved; do not add GitHub Actions or another CI provider.

## Risks / unresolved questions

- The existing Supabase session adapter is a boundary, not production identity until provider-backed verification is implemented and tested.
- Supabase Auth and Neon are separate systems; the application must explicitly verify the token and map its immutable subject to Neon records.
- Profile visibility, public-field list, handle policy and deletion/retention semantics must be derived from normative documents. Any gap is a stop-and-escalate decision, not an invitation to invent defaults.
- Provider SDK versions and free-tier limits must be checked at implementation time.

## Rollback and recovery

- Use additive, forward-only migration design with a documented recovery procedure.
- Keep demo UI/data available behind an explicit demo boundary until persisted profile routes are verified.
- Do not delete existing demo fixtures or alter the main branch.
