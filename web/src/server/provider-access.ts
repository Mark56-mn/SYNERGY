import "server-only";

/**
 * Composition root for server-side dependencies.
 *
 * Inspecting the real environment is cheaper than guessing about a
 * mock-based DI container: this module decides, from the configured
 * environment, which concrete implementations the routes receive.
 *
 * - `SupabaseSessionSource` requires configured Supabase Auth variables;
 *   it is explicitly NOT configured in this task (no provider project yet,
 *   G-2 provisioning is owner-owned), so a clear setup error is thrown on
 *   demand instead of silently shipping an unverified identity path.
 * - Routes that need a session in this foundation receive their source at
 *   construction time (see src/modules/example-owned-resource/), so tests
 *   inject labelled test doubles and never the real path.
 */

import { SupabaseSessionSource } from "@/server/auth/session";
import { getEnv } from "@/server/env";

export function createSupabaseSessionSource(): SupabaseSessionSource {
  const env = getEnv();
  if (!env.SUPABASE_AUTH_URL || !env.SUPABASE_AUTH_ANON_KEY) {
    throw new Error(
      "Supabase Auth is not configured in this environment (SUPABASE_AUTH_URL / SUPABASE_AUTH_ANON_KEY missing). Configure G-2 provider credentials in approved secret storage before identity flows go live.",
    );
  }
  return new SupabaseSessionSource({
    readBearerToken: (request: Request) => {
      const header = request.headers.get("authorization");
      if (header?.startsWith("Bearer ")) {
        const token = header.slice(7).trim();
        return token.length > 0 ? token : null;
      }
      return null;
    },
    verify: async (token: string) => {
      // Deliberately NOT implemented in this task: no Supabase project
      // exists to verify against (G-2). Identity verification must be
      // validated end-to-end when credentials land; nothing may pretend it.
      void token;
      return null;
    },
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
