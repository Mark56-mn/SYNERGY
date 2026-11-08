/**
 * Auth cookie helpers (TASK-006B).
 *
 * The browser session is carried in two HttpOnly cookies: the Supabase access
 * token and the refresh token. They are set exclusively by server code
 * (auth API routes and the session-refresh middleware) and are never readable
 * from browser JavaScript, so no token ever reaches `localStorage`, a React
 * state tree, or a frontend bundle.
 *
 * This module is deliberately EDGE-SAFE (no `server-only` import): the
 * middleware that refreshes sessions runs on the edge runtime and needs the
 * same names and flags. Nothing here logs or returns credential values to
 * clients — it only builds `Set-Cookie` header values.
 */

export const ACCESS_COOKIE = "synergy_access_token";
export const REFRESH_COOKIE = "synergy_refresh_token";

/** Refresh-token cookie lifetime: 7 days, sliding on each refresh. */
export const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Fixed cookie attributes shared by route handlers and middleware. */
export const AUTH_COOKIE_PATH = "/";

export function parseCookies(
  cookieHeader: string | null | undefined,
): Map<string, string> {
  const jar = new Map<string, string>();
  if (!cookieHeader) {
    return jar;
  }
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (name) {
      jar.set(name, value);
    }
  }
  return jar;
}

function serialize(
  name: string,
  value: string,
  options: { maxAgeSeconds: number; secure: boolean },
): string {
  const parts = [
    `${name}=${value}`,
    `Path=${AUTH_COOKIE_PATH}`,
    `Max-Age=${options.maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Build `Set-Cookie` values for a fresh or refreshed session. The access
 * cookie lifetime follows the provider-issued `expiresIn` (clamped to a
 * sane range); the refresh cookie uses the fixed sliding lifetime.
 */
export function buildAuthSetCookies(options: {
  accessToken: string;
  refreshToken: string;
  accessMaxAgeSeconds: number;
  secure: boolean;
}): string[] {
  const accessMaxAge = Math.min(
    Math.max(Math.trunc(options.accessMaxAgeSeconds) || 3600, 1),
    86_400,
  );
  return [
    serialize(ACCESS_COOKIE, options.accessToken, {
      maxAgeSeconds: accessMaxAge,
      secure: options.secure,
    }),
    serialize(REFRESH_COOKIE, options.refreshToken, {
      maxAgeSeconds: REFRESH_MAX_AGE_SECONDS,
      secure: options.secure,
    }),
  ];
}

/**
 * Access-token cookie only (e.g. a session established without a refresh
 * token). The refresh cookie is left untouched.
 */
export function buildAccessOnlyCookie(options: {
  accessToken: string;
  accessMaxAgeSeconds: number;
  secure: boolean;
}): string[] {
  const accessMaxAge = Math.min(
    Math.max(Math.trunc(options.accessMaxAgeSeconds) || 3600, 1),
    86_400,
  );
  return [
    serialize(ACCESS_COOKIE, options.accessToken, {
      maxAgeSeconds: accessMaxAge,
      secure: options.secure,
    }),
  ];
}

/** Expired values for both cookies (logout and failed refresh). */
export function buildClearCookies(secure: boolean): string[] {
  return [
    serialize(ACCESS_COOKIE, "", { maxAgeSeconds: 0, secure }),
    serialize(REFRESH_COOKIE, "", { maxAgeSeconds: 0, secure }),
  ];
}

/** Append several `Set-Cookie` header values to a `Headers` instance. */
export function appendSetCookies(headers: Headers, values: string[]): void {
  for (const value of values) {
    headers.append("set-cookie", value);
  }
}

/** Whether this request arrived over HTTPS (drives the `Secure` flag). */
export function requestIsSecure(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}
