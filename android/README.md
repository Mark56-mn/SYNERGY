# SYNERGY Android foundation (Expo)

Status: **application foundation only.** This is NOT a release-ready app and
NOT a Play Store listing; a scaffold existing is a development starting
point, nothing more (ADR-0012). The website remains the first implementation
priority — every product capability lands on the web first, then here.

## What exists

- `app/_layout.tsx` — root navigation stack using the shared design tokens
  (`@synergy/design-tokens`): dark navy surfaces, mint accent.
- `app/(tabs)/` — five-screen tab navigation matching the product's
  candidate IA (Home, Services, Create, Market, Profile). Every screen is an
  honest placeholder — no fake accounts, business profiles or feed data.
- `app.json` — Expo configuration. Contains **no secrets** by design: only
  non-credential, public configuration (e.g. `extra.publicApiBaseUrl`) ever
  goes in here. There is no `EXPO_PUBLIC_*` secret policy anywhere.
- `metro.config.js` — monorepo wiring (workspace root watch folder) so this
  app consumes `@synergy/domain` (shared contracts) and
  `@synergy/design-tokens` from source, in step with the web app.
- A second backend, a second identity system, and native capability usage
  (push, camera, location) are deliberately absent. When native capabilities
  are needed, they sit behind platform abstraction seams (ADR-0012).

## Prerequisites

- Node.js ≥ 20 (installed in this workspace: v26).
- For running/binding on a device or emulator: **Android Studio + Android
  SDK** with `ANDROID_HOME` set. THIS CHAT'S WORKSPACE HAS NO ANDROID SDK
  (verified: no `ANDROID_HOME`, no `JAVA_HOME`, no `adb`/`sdkmanager`), so
  the one thing not verifiable here is the compiled APK/emulator step.
- Expo Go (play store) covers JS-level development without a full SDK.

## Commands (run from the repository root)

```bash
npm install                      # installs all workspaces (first run)
npm run android:apply-versions   # align RN/expo-router versions to the SDK (expo install --fix)
npm run android:typecheck        # tsc --noEmit for the Android app (runs here)
npm run android:start            # expo start (JS bundle dev server)
```

On a machine with the Android SDK:

```bash
cd android && npx expo run:android        # debug build onto device/emulator
cd android && npx expo export -p android   # production JS bundle check (no SDK needed)
```

Play Store delivery (EAS build / submission) is **not** configured and is a
separate owner decision with its own review (ADR-0002 §native trade-offs).

## Known limitation recorded for TASK-003

The Android build is not verifiable in this environment (no Android
SDK/Java). Verified here: TypeScript typecheck after dependency install, and
config sanity. NOT verified here: Metro bundling on-device, native build,
and runtime behaviour — a developer with Android tooling must run the
commands above before any claim beyond "foundation exists".
