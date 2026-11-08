/**
 * Open-redirect guard for post-auth destinations (TASK-006B).
 *
 * Only same-app relative paths are allowed: a single leading `/`, no
 * protocol-relative `//`, no backslash tricks, no control characters.
 * Auth screens themselves are excluded so a `next` value cannot bounce the
 * user straight back around a redirect loop. Client-safe (no server-only
 * imports) so forms and pages share one implementation.
 */

const AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
]);

export function safeNextPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string") {
    return fallback;
  }
  const candidate = next.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/\\") ||
    /[\u0000-\u001f\u007f\\]/.test(candidate)
  ) {
    return fallback;
  }
  const pathOnly = candidate.split(/[?#]/, 1)[0] ?? "/";
  if (AUTH_PATHS.has(pathOnly)) {
    return fallback;
  }
  return candidate;
}
