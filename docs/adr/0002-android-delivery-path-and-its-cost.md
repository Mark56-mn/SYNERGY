ADR-0002 — Android delivery path and its cost

Status: RECOMMENDED (pending owner approval)

Context
SYNERGY's first mobile target is Android (MVP_SCOPE.md defers iOS). The audience includes lower-cost Android devices and slow/unreliable networks. We must choose the minimum path that gets a usable mobile experience without paying for or maintaining a second client prematurely. Any choice must keep the modular monolith's server-first design intact: the web client and any mobile client share the same server-side auth, policy and media boundary.

Constraint from approved documents
- MASTER_BLUEPRINT.md: modular monolith; provider adapters; no Firebase unless there is a concrete approved need (push/background are concrete needs, so each candidate's push/background model must be evaluated against the approved “only if needed” rule).
- MVP_SCOPE.md: responsive web experience is the MVP; Android delivery plan/foundation should not destabilise the web MVP.
- Blueprint v1.0 UI mockups: the product is mobile-UI-centric (bottom nav: Home, Services, Create, Market, Profile). The mobile experience is first-class, not an afterthought.
- QUALIFYING_GATES.md-style expectation (from the plan): implement what is approved; do not scaffold two clients.

Options considered
1. Installable PWA first, native wrappers later (RECOMMENDED for Phase 1)
   - One codebase (the Next.js web app), add to-home-screen from mobile browsers, share the same server-side auth/policy/media boundary.
   - No Play Store review for MVP; zero added infrastructure; works on lower-cost Android devices without a native runtime cost.
   - Cost: basically zero beyond the web app. Watch out for weak background/push on some devices and on browsers that limit service-worker lifecycle; if push/background becomes a confirmed need, re-evaluate.
   - Risk: no Play Store presence at launch and no native device APIs. That is an explicit MVP trade-off, not a bug.

2. React Native / Expo (recommended from Phase 2 if store presence is required)
   - Real store presence and native push, shared TypeScript, often good developer experience.
   - A second client to build and test; two design-system renderers; more maintenance load than a PWA.
   - Cost: more engineering time and App Store/Play review overhead from the point it is adopted (not necessarily from MVP).

3. Fully native Kotlin
   - Best platform integration and performance where it matters.
   - Doubles delivery cost and slows the path to a validated product.
   - Defer.

Decision
RECOMMENDED for Phase 1: installable PWA first. Build the responsive web app as the single mobile surface, make it installable, and validate real mobile usage before committing to a native client. Move to React Native/Expo only if a concrete, approved need for store presence, native push, or device APIs emerges that the PWA cannot meet. Do not scaffold two Android clients now.

Consequences
- Positive: one codebase for web + MVP mobile; no extra infrastructure; fastest path to validating the mobile experience on the intended devices.
- Negative: no Play Store entry at launch; limited background/push depending on browser/device. If either is a launch blocker, this ADR must be revisited (and that is a product decision, not an implementation surprise).
- Risk: “no store” may feel like a launch problem later; the correct response is a documented decision, not a silent second client.

Security and cost impact
- Security: because the PWA uses the same server-side auth/policy boundary, the server-authoritative model is unchanged. Client-side storage/cookies/service-worker boundaries still need review; this ADR does not exempt them.
- Cost: near-zero additional cost for the PWA path; native clients add ongoing engineering and store overhead. This is an approval ask, not a commitment to spend.

Open dependencies
- D-02 (Android path) — this ADR is the proposed resolution; owner approval required.
- If Push Notifications become a confirmed MVP requirement, re-open this ADR with that constraint explicitly — do not add Firebase or another push provider under the guise of “mobile” without an approved need.
