import "server-only";

/**
 * Composition root for server-side dependencies (TASK-006A + 006B).
 *
 * Inspecting the real environment is cheaper than guessing about a
 * mock-based DI container: this module decides, from the configured
 * environment, which concrete implementations the routes receive.
 *
 * - `SupabaseSessionSource` is the production path. It verifies the caller's
 *   Supabase Auth session server-side through the provider's own
 *   `/auth/v1/user` endpoint (TASK-006A), reading the token from the
 *   `Authorization: Bearer` header when present and otherwise from the
 *   HttpOnly session cookie (TASK-006B). Bearer always wins.
 * - `createAuthGateway()` builds the server-only credential gateway
 *   (sign-in/up/out, recovery, refresh) against the same project.
 * - `getLazySessionSource()` / gateway accessors defer construction to first
 *   request use, so importing a route module never requires credentials and
 *   `next build` stays credential-free.
 * - `getCurrentSession()` is the server-component entry point for pages: it
 *   reads the session cookie and runs the same provider verification. It
 *   cannot refresh or set cookies (server components are read-only); the
 *   session-refresh middleware keeps the cookie fresh before pages render.
 */

import {
  SupabaseSessionSource,
  bearerTokenOf,
  type Session,
  type SessionSource,
} from "@/server/auth/session";
import {
  createSupabaseAuthGateway,
  type AuthGateway,
} from "@/server/auth/auth-gateway";
import { ACCESS_COOKIE, parseCookies } from "@/server/auth/cookies";
import { createSupabaseTokenVerifier } from "@/server/auth/supabase-session";
import { getEnv } from "@/server/env";
import {
  createInMemoryRateLimiter,
  type RateLimiter,
} from "@/server/ratelimit";

const NOT_CONFIGURED =
  "Supabase Auth is not configured in this environment (SUPABASE_AUTH_URL / SUPABASE_AUTH_ANON_KEY missing). Configure G-2 provider credentials in approved secret storage before identity flows go live.";

export function createSupabaseSessionSource(): SupabaseSessionSource {
  const env = getEnv();
  if (!env.SUPABASE_AUTH_URL || !env.SUPABASE_AUTH_ANON_KEY) {
    throw new Error(NOT_CONFIGURED);
  }

  const verifier = createSupabaseTokenVerifier({
    url: env.SUPABASE_AUTH_URL,
    anonKey: env.SUPABASE_AUTH_ANON_KEY,
  });

  return new SupabaseSessionSource({
    readBearerToken: (request: Request) => bearerTokenOf(request),
    readAccessTokenFromCookie: (request: Request) =>
      parseCookies(request.headers.get("cookie")).get(ACCESS_COOKIE) ?? null,
    verify: (token: string) => verifier.verify(token),
  });
}

export function createAuthGateway(): AuthGateway {
  const env = getEnv();
  if (!env.SUPABASE_AUTH_URL || !env.SUPABASE_AUTH_ANON_KEY) {
    throw new Error(NOT_CONFIGURED);
  }
  return createSupabaseAuthGateway({
    url: env.SUPABASE_AUTH_URL,
    anonKey: env.SUPABASE_AUTH_ANON_KEY,
  });
}

/**
 * Shared lazy session source for route modules: denies (returns `null`) when
 * Auth is unconfigured instead of throwing at import time. Constructed once
 * per process after the first request.
 */
export function getLazySessionSource(): SessionSource {
  let cached: SessionSource | null = null;
  return {
    async getSession(request: Request) {
      if (cached) {
        return cached.getSession(request);
      }
      if (!isSupabaseAuthConfigured()) {
        return null;
      }
      cached = createSupabaseSessionSource();
      return cached.getSession(request);
    },
  };
}

let cachedGateway: AuthGateway | null = null;

/** Lazy credential gateway for auth route modules (never at import time). */
export function getLazyAuthGateway(): AuthGateway {
  const build = (): AuthGateway => {
    cachedGateway ??= createAuthGateway();
    return cachedGateway;
  };
  return {
    signIn: (email, password) => build().signIn(email, password),
    signUp: (email, password, redirectTo) =>
      build().signUp(email, password, redirectTo),
    signOut: (token) => build().signOut(token),
    requestPasswordRecovery: (email, redirectTo) =>
      build().requestPasswordRecovery(email, redirectTo),
    updatePassword: (token, password) =>
      build().updatePassword(token, password),
    refresh: (token) => build().refresh(token),
  };
}

/**
 * Credential-endpoint rate limiter: 20 attempts per minute per peer key
 * (unauthenticated callers are keyed by network peer — see handler.ts).
 * In-memory, per-process; the boundary module documents that limit honestly.
 */
export function createAuthRateLimiter(): RateLimiter {
  return createInMemoryRateLimiter({ maxPerWindow: 20, windowSeconds: 60 });
}

/**
 * Read the presented access token (Bearer header first, then the session
 * cookie) for server handlers that must forward it to the provider (e.g.
 * password update). Identity decisions never use this raw value — they use
 * the verified session.
 */
export function readRequestAccessToken(request: Request): string | null {
  return (
    bearerTokenOf(request) ??
    parseCookies(request.headers.get("cookie")).get(ACCESS_COOKIE) ??
    null
  );
}

/**
 * Server-component session for pages and the root layout. Returns the
 * verified session or `null`. Never throws for missing configuration — an
 * unconfigured environment is simply signed out everywhere.
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return null;
  }
  if (!isSupabaseAuthConfigured()) {
    return null;
  }
  const source = createSupabaseSessionSource();
  const headers = new Headers();
  headers.set("authorization", `Bearer ${accessToken}`);
  const request = new Request("https://internal.invalid/", { headers });
  return source.getSession(request);
}

/**
 * Return false only when the environment is valid but the two Supabase
 * credentials are absent (the supported local-development state).
 *
 * Do not catch getEnv() failures here. In staging/production, or when any
 * supplied environment variable is malformed, getEnv() throws an
 * EnvValidationError containing variable NAMES only. Let that error reach
 * the route wrapper so its server-side log exposes the real configuration
 * problem instead of disguising it as "Supabase Auth is not configured".
 * Secret values are never included in the validation error.
 */
export function isSupabaseAuthConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.SUPABASE_AUTH_URL && env.SUPABASE_AUTH_ANON_KEY);
}
