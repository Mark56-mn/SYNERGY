# TASK-006 — Identity and profile persistence planning handoff

- **Task ID / title:** TASK-006 — Identity and profile persistence
- **Status:** BLOCKED — planning document prepared; implementation has not started.
- **Branch:** `chore/autonomous-foundation-v1`
- **Planning base:** `f58fdfbc4acb8321a0c6b503eacbb15de2ac4823`
- **Commit:** pending this planning-only record.
- **Objective:** prepare a gated, testable plan for server-verified Supabase Auth sessions and Neon-backed user profiles.

## Scope prepared

The implementation is split into:
- TASK-006A: provider-backed identity/session integration.
- TASK-006B: minimal profile schema, migrations and owner-authorised profile read/update flows.

The complete scope, non-goals, security rules, acceptance criteria, test plan, risks and recovery requirements are in `task/TASK-006-identity-and-profile-persistence.md`.

## Current implementation state

No application code, dependencies, schema, migrations, provider configuration or credentials were changed. The current `SupabaseSessionSource.verify()` remains a non-live boundary that returns null until the identity slice is implemented. Demo profile content remains fictional and labelled.

## Blocking conditions

1. G-2 owner provisioning is not evidenced as complete.
2. The owner must explicitly release TASK-006A for implementation after provisioning.
3. TASK-006B depends on TASK-006A being implemented and reviewed.
4. B-5 dependency-major decisions and G-5 CI selection remain separate unresolved items.

No accounts were created, no paid services used, no secrets requested or exposed, no deployment performed, and no merge to `main`.

## Security and privacy

The plan preserves Supabase Auth as the sole identity authority and Neon as the application database. It explicitly forbids trusting browser-supplied IDs/roles, assumes no Supabase auth helpers on Neon, requires server-side token verification, owner-only mutations, negative cross-user tests, safe errors, rate limits and redacted logs. Profile visibility/field policy must come from normative sources; missing rules require owner review.

## UI and design

Preserve the existing navy + mint token system, mobile-first layout, accessible components and responsive checks. Demo fixtures must remain visibly demo-only until persisted routes are ready. No invented avatar, verification or public/private profile defaults.

## Commands and evidence

No build/test command was run because this was a planning-only GitHub documentation operation, not a checked-out workspace execution. No test result is claimed.

## Next action

Owner completes G-2 using free-tier development services and environment secret storage, then explicitly authorises TASK-006A. Only after TASK-006A review may TASK-006B begin.
