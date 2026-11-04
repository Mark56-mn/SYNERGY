ADR-0001 — Web application framework and rendering strategy

Status: RECOMMENDED (pending owner approval)

Context
We need a server-first web framework for SYNERGY's module monolith. The customer base is Nigeria-first with an Ibadan initial launch, including lower-cost Android devices and slow/unreliable networks. VIDEO_FIRST is false for MVP; the feed is text/image first (per MVP_SCOPE.md), so first-paint performance on slow networks and server-side enforcement of auth/policy are the dominant quality concerns for the web client, not rich video rendering.

Constraint from approved documents
- MASTER_BLUEPRINT.md: modular monolith; no Firebase without a concrete approved need; provider adapters to avoid lock-in; separate dev/staging/prod.
- MVP_SCOPE.md: web MVP is responsive-first and mobile-first; loading, empty, error and success states required; no real payments.
- DESIGN_SYSTEM.md: design tokens centralised; reuse primitives; mobile-first.
- SECURITY_RULES.md: validate and authorise on the server; secrets server-side only; parameterised queries; redact PII from logs.
- SYSTEM_ARCHITECTURE.md: no cross-module imports except through a module's public service; server-only code must not reach the client bundle; adapters for auth/media/notifications.
- QUALITY_GATES.md: gates must run locally; no GitHub Actions without approval.
- Blueprint v1.0: video ads muted by default; coarse-only targeting; ranking separation must be visible in the feed model (not retrofitted). These are product decisions that affect the framework choice only indirectly (a server-side framework makes it easier to keep ranking and policy server-side).

Options considered
1. Next.js App Router + TypeScript strict (RECOMMENDED)
   - Server Components and server actions keep auth, policy, secrets and data access on the server by default; the client bundle gets only what it needs.
   - One deployable artefact for UI + API routes; large ecosystem for auth adapters, media, admin tooling, and Playwright/E2E.
   - Cost concern: the default managed host is a potential paid dependency at scale; the app is self-hostable on a server-side Node runtime (Cloudflare Workers-compatible servers are possible but require adapter/version checks — not assumed here).

2. Remix / React Router (server-first)
   - Clean data-loading model; server-first by design; good for forms and progressive enhancement.
   - Smaller hiring pool and fewer ready-made admin/moderation integrations than Next.js.
   - Viable alternative if the team prefers its model.

3. SvelteKit
   - Small bundles and strong mobile performance; good for the design-system candidate of small/low-power devices.
   - Smaller ecosystem for the later admin/moderation and moderation tooling surfaces.
   - Viable alternative; can be revisited if bundle size on low-end Androids becomes a measured problem.

4. Vite SPA + separate API server
   - Two deployables; auth and policy enforcement must be duplicated or carefully unified; worse first-paint on slow networks because the initial HTML is essentially empty.
   - Not recommended for this product's slow-network reality.

Decision
RECOMMENDED: Next.js (App Router) + TypeScript strict, server-first. Keep server logic in server components/actions/server utilities so auth, policy, secrets and data access live on the server. Client components are pure UI and receive already-authorised, already-shaped data. This best matches the documented constraints (server-authoritative auth, secrets server-side, provider adapters, consolidated deployable) and the product's slow-network audience.

Alternatives are viable; choose one and document why if a different one is preferred. Do not adopt two web frameworks.

Consequences
- Positive: a single server-side rendering surface makes server-authoritative auth and policy easier to enforce; server-only utilities are naturally isolated from the client bundle by Next.js Server Components boundaries; one artefact to deploy per environment.
- Negative: larger initial buy-in than a minimal SPA; hosting choices matter as usage grows (recommend evaluating self-hostable options early if the managed host becomes expensive). This ADR is silent on the hosting decision; hosting is covered by the cost proposal in the plan.
- Risk: bundle size and server cost must be measured on real low-end devices before any performance claim is made. Plan to measure, not to assume.

Security and cost impact
- Security: improves the ability to keep auth, policy, secrets and data access server-side — consistent with SECURITY_RULES.md. Does not by itself provide those controls; they must still be implemented.
- Cost: a managed Vercel-style host can become a paid dependency; the plan presents free-tier/cheapest viable hosting as an approval ask, not a recommendation to incur cost. Do not commit to a paid host here.

Open dependencies
- D-02 (web framework choice) — this ADR is the proposed resolution; owner approval makes it the working default.
- Hosting/cost decision is separate (approval ask in the plan's cost section).
- ADR-0003 (authorisation model) and ADR-0004 (data tooling) interact with this choice but do not depend on the specific framework; they remain required regardless.
