/**
 * Session-refresh decision + call (TASK-006B), edge-safe.
 *
 * The middleware runs this on every request that carries an auth cookie. Its
 * only job is to keep the cookies fresh; it NEVER makes an authentication
 * decision. Authorization always happens downstream, server-side, by
 * verifying the access token with the provider (`supabase-session.ts`).
 *
 * The JWT `exp` claim is decoded here for refresh TIMING ONLY (to avoid a
 * provider call on every request). The signature is never trusted from this
 * decode — a forged token with a far-future `exp` simply skips refreshing and
 * then fails provider verification downstream, exactly as it should.
 */

export type SessionRefreshResult =
  | { kind: "anonymous" }
  | { kind: "fresh" }
  | {
      kind: "refreshed";
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }
  | { kind: "clear" }
  | { kind: "unavailable" };

/** Refresh when the access token expires within this many seconds. */
export const REFRESH_SKEW_SECONDS = 60;

export interface RefreshOptions {
  accessToken: string | null;
  refreshToken: string | null;
  url: string;
  anonKey: string;
  fetchImpl?: typeof fetch;
  nowSeconds?: number;
}

/**
 * Read the `exp` claim (seconds since epoch) from a JWT payload WITHOUT any
 * trust in it — timing hints only. Returns `null` for anything malformed.
 */
export function decodeJwtExpiry(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) {
      return null;
    }
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const remainder = payload.length % 4;
    if (remainder > 0) {
      payload += "=".repeat(4 - remainder);
    }
    const decoded = atob(payload);
    const claims = JSON.parse(decoded) as { exp?: unknown };
    return typeof claims.exp === "number" && Number.isFinite(claims.exp)
      ? claims.exp
      : null;
  } catch {
    return null;
  }
}

export async function refreshSessionIfNeeded(
  options: RefreshOptions,
): Promise<SessionRefreshResult> {
  const { accessToken, refreshToken } = options;
  if (!refreshToken) {
    return { kind: "anonymous" };
  }

  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (accessToken) {
    const expiry = decodeJwtExpiry(accessToken);
    if (expiry !== null && expiry - now > REFRESH_SKEW_SECONDS) {
      return { kind: "fresh" };
    }
  }

  const doFetch = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await doFetch(
      `${options.url.replace(/\/$/, "")}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: options.anonKey,
          authorization: `Bearer ${options.anonKey}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    );
  } catch {
    // Network failure: keep the cookies so the next request can retry; the
    // downstream verifier will treat this request as unauthenticated.
    return { kind: "unavailable" };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const data = body as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
  } | null;
  if (
    response.ok &&
    typeof data?.access_token === "string" &&
    data.access_token.length > 0 &&
    typeof data?.refresh_token === "string" &&
    data.refresh_token.length > 0
  ) {
    return {
      kind: "refreshed",
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn:
        typeof data.expires_in === "number" && data.expires_in > 0
          ? data.expires_in
          : 3600,
    };
  }

  // The provider spoke and refused: the refresh token is dead (expired,
  // revoked, rotated elsewhere). Clear the cookies so the app is signed out
  // rather than stuck in a half-signed-in state.
  return { kind: "clear" };
}
