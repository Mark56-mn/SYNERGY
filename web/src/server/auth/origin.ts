import "server-only";

import { forbidden } from "@/server/http/errors";

/**
 * Same-origin checks for browser-driven auth mutations (TASK-006B).
 *
 * Cookie sessions are ambient authority: the browser attaches the cookies to
 * cross-site requests automatically, which is exactly the CSRF shape. Two
 * defences combine here:
 *
 *   1. `SameSite=Lax` on the auth cookies (cookies.ts) — modern browsers
 *      withhold them from cross-site POSTs.
 *   2. An explicit Origin check on every cookie-authenticated or
 *      cookie-setting mutation in this task.
 *
 * Bearer-token API clients are unaffected: they present credentials
 * explicitly, so CSRF does not apply and no Origin is required of them.
 * Browsers always send `Origin` on POST `fetch()` calls, so REQUIRING it on
 * browser-only endpoints (logout, password update, session establish) does
 * not break real users.
 */

/** True only when an `Origin` header is present and matches the request host. */
export function originMatchesHost(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  // Compare against the Host header, not request.url: frameworks synthesize
  // the URL host in some runtimes (Next dev reports 0.0.0.0) while Host is
  // what the browser actually visited.
  const host = request.headers.get("host") ?? new URL(request.url).host;
  return originHost === host;
}

/**
 * Require a same-origin `Origin` header (browser-only mutations backed by
 * cookies). Throws `forbidden` otherwise — a generic denial that reveals
 * nothing about auth state.
 */
export function requireSameOrigin(request: Request): void {
  if (!originMatchesHost(request)) {
    throw forbidden("This action must be started from the SYNERGY app itself.");
  }
}

/**
 * For credential POSTs (login/register/recover) that do not depend on
 * cookies: reject when an `Origin` header IS present but mismatched (a
 * browser cross-site attempt), allow when absent (non-browser callers).
 */
export function rejectCrossOriginIfPresent(request: Request): void {
  if (request.headers.get("origin") && !originMatchesHost(request)) {
    throw forbidden("This action must be started from the SYNERGY app itself.");
  }
}
