import "server-only";

/**
 * Composition root for server-side dependencies.
 *
 * Inspecting the real environment is cheaper than guessing about a
 * mock-based DI container: this module decides, from the configured
 * environment, which concrete implementations the routes receive.
 *
 * - `SupabaseSessionSource` is the production path (TASK-006A). It verifies
 *   the caller's Supabase Auth session server-side through the provider's own
 *   `/auth/v1/user` endpoint, so signature, issuer, audience, expiry and
 *   revocation are the provider's judgement and never re-implemented here.
 *   Construction is configuration-gated: without `SUPABASE_AUTH_URL` and
 *   `SUPABASE_AUTH_ANON_KEY` it throws a value-free setup error, and callers
 *   that must not fail hard use `isSupabaseAuthConfigured()` and deny.
 * - Routes are constructed with their source, so tests inject labelled test
 *   doubles and never the real path.
 */

import { SupabaseSessionSource, bearerTokenOf } from "@/server/auth/session";
import { createSupabaseTokenVerifier } from "@/server/auth/supabase-session";
import { getEnv } from "@/server/env";

export function createSupabaseSessionSource(): SupabaseSessionSource {
  const env = getEnv();
  if (!env.SUPABASE_AUTH_URL || !env.SUPABASE_AUTH_ANON_KEY) {
    throw new Error(
      "Supabase Auth is not configured in this environment (SUPABASE_AUTH_URL / SUPABASE_AUTH_ANON_KEY missing). Configure G-2 provider credentials in approved secret storage before identity flows go live.",
    );
  }

  const verifier = createSupabaseTokenVerifier({
    url: env.SUPABASE_AUTH_URL,
    anonKey: env.SUPABASE_AUTH_ANON_KEY,
  });

  return new SupabaseSessionSource({
    readBearerToken: (request: Request) => bearerTokenOf(request),
    verify: (token: string) => verifier.verify(token),
  });
}

/** Minimal public surface: which source a route should use, given env setup. */
export function isSupabaseAuthConfigured(): boolean {
  try {
    const env = getEnv();
    return Boolean(env.SUPABASE_AUTH_URL && env.SUPABASE_AUTH_ANON_KEY);
  } catch {
    return false;
  }
}
