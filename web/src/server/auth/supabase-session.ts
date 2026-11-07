import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Auth token verification (TASK-006A).
 *
 * Supabase Auth is the ONLY identity authority (ADR-0003): nothing here creates,
 * stores or verifies passwords, and no second identity store is introduced.
 *
 * Verification uses the officially supported mechanism rather than hand-rolled
 * cryptography: `supabase.auth.getUser(jwt)` sends the presented token to the
 * project's `/auth/v1/user` endpoint, where the provider validates the
 * signature, issuer, audience, expiry and revocation state, and returns the
 * user record only for a token it still accepts. The `@supabase/supabase-js`
 * dependency was already part of the web app, so this integration adds NO new
 * package.
 *
 * Failure is always `null` (deny by default), and the token is never logged,
 * echoed into an error or attached to a thrown value. Supabase's own rules and
 * error codes are collapsed at this boundary so callers cannot distinguish
 * "expired" from "forged" from "revoked" — that distinction is an enumeration
 * aid, not a useful client-facing fact.
 *
 * IMPORTANT: without project credentials (`SUPABASE_AUTH_URL`,
 * `SUPABASE_AUTH_ANON_KEY`) this path is never constructed and the route
 * resolves to "no session". Live-provider verification is therefore NOT
 * claimed by the accompanying tests; they cover the boundary and the parsing
 * around the provider call with the transport stubbed.
 */

/** A verified identity: the Supabase Auth user id (the profile key in Neon). */
export interface VerifiedIdentity {
  /** Supabase Auth user id. Validated as a UUID; never a client-supplied value. */
  id: string;
}

/** Minimal surface the session source needs; tests inject their own. */
export interface TokenVerifier {
  /** Returns the provider-verified identity, or `null` if the token is not acceptable. */
  verify(token: string): Promise<VerifiedIdentity | null>;
}

/**
 * Accepted UUID shape for the `sub`/user id returned by the provider. A value
 * that is not a UUID cannot be a Supabase Auth user id, so it is rejected
 * rather than trusted downstream as an ownership key.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface SupabaseTokenVerifierOptions {
  /** Project URL, e.g. the `SUPABASE_AUTH_URL` value. */
  url: string;
  /** Public project accessor (`SUPABASE_AUTH_ANON_KEY`), used server-side only. */
  anonKey: string;
  /**
   * Transport override. Production never sets this; the test suite supplies a
   * deterministic stub so the boundary can be exercised without a network or
   * a real credential.
   */
  fetchImpl?: typeof fetch;
}

export function createSupabaseTokenVerifier(
  options: SupabaseTokenVerifierOptions,
): TokenVerifier {
  const client = createClient(options.url, options.anonKey, {
    auth: {
      // Server-side verification must never persist or refresh a browser
      // session: the caller's token is the only state involved.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...(options.fetchImpl ? { global: { fetch: options.fetchImpl } } : {}),
  });

  return {
    async verify(token: string): Promise<VerifiedIdentity | null> {
      const presented = token.trim();
      if (presented.length === 0) {
        return null;
      }

      try {
        const { data, error } = await client.auth.getUser(presented);
        if (error) {
          // Deliberately not logged: provider error text can quote the token
          // or fragment of it, and error differences aid enumeration.
          return null;
        }
        const id = data.user?.id;
        if (!id || !UUID_PATTERN.test(id)) {
          return null;
        }
        return { id };
      } catch {
        // Network failure, malformed provider response, aborted request: all
        // deny. The token is never included in the thrown value or the log.
        return null;
      }
    },
  };
}
