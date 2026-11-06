import "server-only";

import { forbidden, unauthorized } from "@/server/http/errors";
import type { Session } from "@/server/auth/session";
import type { Role } from "@/server/roles";

/**
 * Authorisation helpers (deny by default — ADR-0003).
 *
 * Every protected operation positively establishes:
 *   1. WHO the caller is (verified session — never a browser-supplied ID), and
 *   2. the caller's right to act on THIS resource (ownership or role).
 *
 * Anything that fails to be established is a denial, and denials are typed
 * `AppError`s with user-safe messages. Helpers never log and never include
 * other users' data in denial details.
 */

/**
 * Require a verified session. `null` (no verified caller) is denied as
 * `unauthorized` — deny by default.
 */
export function requireAuthenticatedUser(session: Session | null): Session {
  if (!session) {
    throw unauthorized();
  }
  return session;
}

/**
 * Require that the verified caller owns the resource identified by
 * `ownerId`. Unauthenticated and non-owner callers are both denied here;
 * returning void means the caller is authorised.
 */
export function requireOwnership(
  session: Session | null,
  ownerId: string,
): void {
  const user = requireAuthenticatedUser(session);
  if (user.userId !== ownerId) {
    // Same outward shape for "other user's resource" and "exists but not
    // yours" — handlers may additionally answer `not_found` where the
    // product contract wants it; this helper stays uniform.
    throw forbidden();
  }
}

/**
 * Require that the verified caller holds at least one of the given roles.
 * Unknown/absent roles deny; client-supplied roles never satisfy this check
 * because `Session.roles` comes only from the verified session source.
 */
export function requireRole(session: Session | null, required: Role[]): void {
  const user = requireAuthenticatedUser(session);
  const holds = required.some((r) => user.roles.includes(r));
  if (!holds) {
    throw forbidden();
  }
}
