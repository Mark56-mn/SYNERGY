# ADR-0012 — Android application foundation (Expo) and its relation to the PWA-first path

Status: ACCEPTED EXECUTING PATH (owner-authorised via MISSION 02; ADR-0002 remains RECOMMENDED product guidance)

Relationship to ADR-0002
- ADR-0002 recommended an installable-PWA-first mobile path for Phase 1 and explicitly deferred scaffolding a native Android client.
- MISSION 02 supplies explicit owner authorisation to "establish a separate Android application foundation so Android development can proceed without redesigning the backend or core domain", while keeping "the website as the first implementation priority".
- This ADR records that authorisation and the path chosen in response; it does not rewrite ADR-0002's product analysis. The web MVP remains the first implementation priority, and the PWA continues to be that mobile surface.

Decision
Chosen path: React Native 0.7x under the Expo SDK, using the Expo Router for file-based navigation, as the Android application foundation.

Reasons (documented before dependency installation)
- ADR-0002's own Phase-2-native option is React Native/Expo. Choosing it keeps the Android client in TypeScript and able to consume the same shared domain-contract and design-token packages as the web app, satisfying "do not duplicate business rules between web and Android".
- Expo removes the need for a local Android SDK to author, typecheck and bundle-check the JS side, so the foundation remains verifiable in this environment at the level this environment supports.
- Expo Router gives a navigation foundation (tab layout matching the product's candidate IA: Home, Services, Create, Market, Profile) without hand-rolled navigation code.

Boundaries recorded by this ADR
- One backend, one identity authority: the Android app contains no second backend, no second authentication/registration system, and no credential or secret in its bundle. Any server/config value it needs is public configuration (for example an API base URL) supplied through environment-style config that contains no secrets.
- Native capabilities (push, background work, camera, location) are not implemented here; when they are, they must sit behind platform abstraction seams, not be called from feature logic.
- No Play Store or release claim is made: a scaffold existing is not a launching or shippable Android application.
- Store presence, native push, and app-store review overhead remain the same trade-offs documented in ADR-0002; they are re-opened only by an explicit owner decision.

Consequences
- Positive: Android work can start in the same language/contracts as web; navigation and visual direction are established now, avoiding a later native redesign pressure on domain design.
- Negative: a second client surface exists from now on and carries its own review/maintenance load; the two-renderer cost named in ADR-0002 begins here.
- Risk: Metro/workspace resolution and real-device behaviour are not verifiable in this environment; they must be verified by a developer with Android tooling before any release-critical claim.

Security and cost impact
- Security: no secret enters the Android bundle; the app depends on the same server-authoritative authorisation as web. Unverified in this environment because the app cannot be compiled/run here.
- Cost: Expo is free tooling; the cost is engineering time maintaining a second client.

Open dependencies
- Play Store presence remains an owner product decision (ADR-0002 §Consequences).
- Push notifications remain unapproved needs; do not add Firebase or any push provider without an approved need (MASTER_BLUEPRINT constraint).
