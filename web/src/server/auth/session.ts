import "server-only";

/**
 * Authentication verification boundary.
 *
 * A browser-supplied user ID is NEVER proof of identity: every protected
 * operation resolves the caller from a verified session, not from request
 * bodies, query parameters or headers crafted by the client.
 *
 * The only identity authority is Supabase Auth (ADR-0003); this module never
 * creates, stores or verifies passwords, and never trusts client-asserted
 * roles.
 *
 * TASK-006A now provides the server-side Supabase Auth bearer-token path:
 * - `SupabaseSessionSource` verifies the caller's token through the configured
 *   project's Auth user endpoint using an env-supplied URL and public anon key.
 * - The implementation agent reports provider reachability and forged-token
 *   rejection against the real project. A successful real-user token has not
 *   yet been verified (B-7b), so live positive-path authentication remains
 *   explicitly unverified.
 * - When unconfigured, the composition root denies access; tests may inject
 *   `TestSessionSource` doubles, which are never production authentication.
 */

export interface Session {
  /** Supabase Auth user id (UUID). The profile key in Neon (`ADR-0003`). */
  userId: string;
  /**
   * Roles attached to the verified session. Client-asserted roles are never
   * merged in here; the verified source owns this list. The foundation
   * default is `member`; richer role models come with the identity tasks.
   */
  roles: Array<"member" | "creator" | "provider" | "moderator">;
}

export interface SessionSource {
  /**
   * Verify the caller's session from the request, or return `null` when no
   * valid session can be established (which every protected operation treats
   * as `unauthorized` — deny by default).
   */
  getSession(request: Request): Promise<Session | null>;
}

/**
 * The verified Supabase-Auth path (production G-2 integration).
 * Construction is explicitly configuration-gated so nothing silently runs
 * half-configured: an unconfigured env produces a clear setup error, and a
 * missing/invalid bearer token produces `null` (deny by default).
 */
export class SupabaseSessionSource implements SessionSource {
  constructor(
    private readonly client: {
      readBearerToken(request: Request): string | null;
      /** Returns the Supabase Auth user id for a verified session token, or null. */
      verify(token: string): Promise<{ id: string } | null>;
    },
  ) {}

  async getSession(request: Request): Promise<Session | null> {
    const token = this.client.readBearerToken(request);
    if (!token) {
      return null;
    }
    const user = await this.client.verify(token);
    if (!user?.id) {
      return null;
    }
    return { userId: user.id, roles: ["member"] };
  }
}

/**
 * Local test double implementing `SessionSource` from an explicit in-memory
 * map. Clearly labelled: THESE SESSIONS ARE NOT VERIFIED AUTHENTICATION, they
 * exist so boundary behaviour can be tested deterministically until G-2.
 */
export class TestSessionSource implements SessionSource {
  constructor(
    private readonly users: Array<{ userId: string; roles?: Session["roles"] }>,
  ) {}

  async getSession(request: Request): Promise<Session | null> {
    const token = bearerTokenOf(request);
    if (!token) {
      return null;
    }
    const found = this.users.find((u) => u.userId === token);
    if (!found) {
      return null;
    }
    return { userId: found.userId, roles: found.roles ?? ["member"] };
  }
}

/** Reads only the `Authorization: Bearer <token>` header; nothing else. */
export function bearerTokenOf(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}
