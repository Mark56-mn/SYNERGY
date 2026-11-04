ADR-0007 — Environment variable schema and secret handling plan

Status: RECOMMENDED (pending owner approval)

Context
The repository currently has no `.env.example`, no `.gitignore`, and no documented env schema (`docs/REPOSITORY_ASSESSMENT.md`). That is the single most urgent hygiene gap once any code exists, because the easiest accidental secret leak is a connection string or provider key committed “temporarily”. This ADR defines the env schema, the `.env.example` contents (names and descriptions only), boot-time validation, environment separation, and the mechanical rule that prevents server secrets from reaching the client bundle.

Constraints from approved documents
- `SECURITY_RULES.md`: never commit credentials/keys/tokens/connection strings/production data; keep secrets server-side; least privilege; separate dev/staging/prod credentials; redact sensitive values from logs.
- `SYSTEM_ARCHITECTURE.md`: separate dev/staging/prod environments with separate credentials/data; never commit secrets or expose provider keys in browser/mobile bundles; use protected environment secrets.
- `MASTER_BLUEPRINT.md`: Supabase Auth is identity; Neon is the database; Cloudinary is the initial media provider; providers should be replaceable.
- `MASTER_BLUEPRINT.md` + `QUALITY_GATES.md`: no GitHub Actions unless explicitly approved; quality/scripts run locally.

Env variable schema (names and purposes only — no values)
Runtime application variables, server-side:
- `APP_ENV` — environment name, e.g. development/staging/production. Used for behaviour toggles and strictness, not for secret routing by itself.
- `APP_ORIGIN` — the canonical origin for this deployment, used for absolute URLs/redirects/session/cookie settings where the app needs an origin. Must be set per environment; not derived from a request Host for security-sensitive purposes.
- `NODE_ENV` — standard runtime mode used by tooling and some libraries.
- `DATABASE_URL` — Neon PostgreSQL connection string for the application database. Server-side only.
- `SUPABASE_AUTH_URL` — Supabase Auth project URL used for auth flows/session verification server-side.
- `SUPABASE_AUTH_ANON_KEY` or equivalent public client accessor — used only where the server needs to initiate/auth-flow handoff with Supabase Auth; treated as a server-side secret for its project scope even if it is a “public” key in Supabase terms. The browser client uses its own scoped mode; the server does not blindly reuse client bundles’ keys.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — Cloudinary credentials for the media adapter server-side. Not present in the browser bundle.
- `MEDIA_PROVIDER_ADAPTER` — which media adapter implementation to use in a given environment (e.g. stub for local tests, Cloudinary for environments with credentials). This is a behaviour switch, not a secret.
- `REDIS_URL` or equivalent background-job store URL — only if/where background jobs are introduced; not assumed for MVP.
- `LOG_LEVEL` / structured-log configuration — controls verbosity and redaction behaviour.
- `RATE_LIMIT_*` — configuration for rate-limit points on auth/messaging/upload/search as relevant.
- `AUDIT_*` / operational toggles — auditLog and operational settings as the app grows.

Client/public variables (safe to expose to the browser where the framework supports it):
- A narrow set of truly public configuration only, such as public media CDN base/variant config that does not contain credentials, and any public client-side feature flags.
- No database connection strings, no Supabase server-sided secrets, no Cloudinary API secret, no signing keys.

`.env.example` contents (names + descriptions only)
The scaffold creates `.env.example` with one entry per variable above, each with a description, a safe placeholder, and a note that real values live only in environment secret storage / per-environment env files that are gitignored. No real credentials are ever written into the example file or into tracked files.

Example shape (descriptions, not real values):
- `APP_ENV` — deployment environment name.
- `APP_ORIGIN` — canonical origin for this deployment.
- `DATABASE_URL` — Neon PostgreSQL connection string (server-side only).
- `SUPABASE_AUTH_URL` — Supabase Auth project URL (server-side).
- `SUPABASE_AUTH_ANON_KEY` — Supabase public accessor used server-side for auth flows; still kept server-side, not shipped to client bundles.
- `CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name for the media adapter.
- `CLOUDINARY_API_KEY` — Cloudinary API key for the media adapter.
- `CLOUDINARY_API_SECRET` — Cloudinary API secret for the media adapter; server-side only.
- `MEDIA_PROVIDER_ADAPTER` — adapter choice for the environment.
- ...and so on for job/log/rate-limit/audit config.

Boot-time validation
At boot, the app validates that all required server-side variables are present and non-empty when the app starts in a mode that needs them. Missing or empty required variables fail fast with a clear message rather than crashing later in a hard-to-trace way. Validation is environment-aware: a variable that is optional in development may be required in staging/production. Validation does not print secret values.

Environment separation
- Development, staging, and production use separate credentials and separate data (`SYSTEM_ARCHITECTURE.md`).
- Local development may use the media stub adapter (`ADR-0005`) and local/test DB where practical, so developers can run the app without provisioning.
- Real provider credentials live only in per-environment secret storage / environment config, never in the repo.
- The same variable names are used across environments where possible, so the app is not rewritten per environment; only the values differ.

The mechanical secret-isolation rule
- Server secrets are never imported into client code. The scaffold enforces this with the same server-only import rules from `ADR-0006`.
- The build/deploy path that produces the client bundle must be incapable of including server-only modules. If a server module is imported anywhere that can reach the client bundle, the build/lint rules fail.
- `.env.example` is the public contract for env shape; real values are not tracked.
- `.env` and any per-deploy secret file are gitignored. The repo must not include `.env` in tracked files.

What this ADR deliberately does not do
- It does not provision Supabase Auth, Neon, or Cloudinary. That is gate G-2, an owner action.
- It does not assign values. It names variables and their purpose so the scaffold can validate them mechanically.
- It does not decide the host. Hosting is covered by `ADR-0010`.

Security and cost impact
- Security: this ADR is the primary prevention for the most common leak path (committed secrets + server code reaching the client bundle). It makes the secret boundary explicit and enforceable before any code is written.
- Cost: no direct cost. The env separation also makes it cheaper/safer to operate multiple environments without credential cross-contamination.

Open dependencies
- `ADR-0006` for the server-only layout that enforces the secret-isolation rule.
- `ADR-0005` for the media adapter naming/adapter-switch variable.
- `ADR-0010` for hosting/secret-storage assumptions.
