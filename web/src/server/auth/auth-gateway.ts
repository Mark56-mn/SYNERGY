import "server-only";

/**
 * Supabase Auth operations gateway (TASK-006B).
 *
 * Every credential operation (sign-in, sign-up, sign-out, password recovery,
 * password update, token refresh) runs SERVER-SIDE through this gateway and
 * talks to Supabase Auth's documented GoTrue REST endpoints with the
 * project's public anon accessor. The browser never receives the anon key,
 * a password, or a token: route handlers call this module and translate the
 * outcome into HttpOnly cookies plus a generic JSON response.
 *
 * Direct REST (rather than a browser-style client) is deliberate:
 *   1. It keeps full, explicit control of the `Set-Cookie` outcome — every
 *      token the provider returns goes straight into HttpOnly cookies.
 *   2. The transport is injectable (`fetchImpl`), matching the TASK-006A
 *      verifier's test pattern, so the whole surface is covered by
 *      deterministic stubbed tests with no network and no real credential.
 *   3. No new dependency: the endpoints are plain HTTPS JSON calls.
 *
 * Error discipline (mirrors `supabase-session.ts`):
 *   - Provider error text/details are NEVER returned to callers or logged —
 *     they can quote credential material and aid account enumeration.
 *   - Sign-in maps every failure to one generic denial; password recovery
 *     always reports success; sign-up never reveals whether an email is
 *     already registered. Callers render the same message either way.
 *   - `signOut` and `requestPasswordRecovery` never throw: logout must always
 *     be able to clear local state, and recovery must never leak state.
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
}

export type SignInResult = { ok: true; tokens: AuthTokens } | { ok: false };

export type SignUpResult =
  | { ok: true; status: "signed-in"; tokens: AuthTokens }
  | { ok: true; status: "confirmation-required" }
  | { ok: false };

export interface AuthGateway {
  signIn(email: string, password: string): Promise<SignInResult>;
  signUp(
    email: string,
    password: string,
    redirectTo: string,
  ): Promise<SignUpResult>;
  /** Best effort: revokes the session provider-side. Never throws. */
  signOut(accessToken: string): Promise<void>;
  /** Always reports the same outward result. Never throws. */
  requestPasswordRecovery(email: string, redirectTo: string): Promise<void>;
  /** True when the provider accepted the new password. */
  updatePassword(accessToken: string, password: string): Promise<boolean>;
  /** Fresh token pair, or `null` when the refresh token is dead. */
  refresh(refreshToken: string): Promise<AuthTokens | null>;
}

export interface AuthGatewayOptions {
  url: string;
  anonKey: string;
  fetchImpl?: typeof fetch;
}

const UUID_LIKE = /^[0-9a-f-]{36}$/i;

export function createSupabaseAuthGateway(
  options: AuthGatewayOptions,
): AuthGateway {
  const baseUrl = options.url.replace(/\/$/, "");
  const doFetch = options.fetchImpl ?? fetch;

  async function postJson(
    path: string,
    body: unknown,
    bearerToken: string | null,
  ): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: options.anonKey,
          authorization: `Bearer ${bearerToken ?? options.anonKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      // Network failure: no detail leaves this module.
      return { ok: false, data: {} };
    }
    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
    const data =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    return { ok: response.ok, data };
  }

  function tokensFrom(data: Record<string, unknown>): AuthTokens | null {
    const accessToken = data["access_token"];
    const refreshToken = data["refresh_token"];
    const user = data["user"] as { id?: unknown } | undefined;
    if (
      typeof accessToken !== "string" ||
      accessToken.length === 0 ||
      typeof refreshToken !== "string" ||
      refreshToken.length === 0 ||
      typeof user?.id !== "string" ||
      !UUID_LIKE.test(user.id)
    ) {
      return null;
    }
    const expiresIn = data["expires_in"];
    return {
      accessToken,
      refreshToken,
      expiresIn:
        typeof expiresIn === "number" && expiresIn > 0 ? expiresIn : 3600,
      userId: user.id,
    };
  }

  return {
    async signIn(email, password) {
      const { ok, data } = await postJson(
        "/auth/v1/token?grant_type=password",
        { email, password },
        null,
      );
      if (!ok) {
        return { ok: false };
      }
      const tokens = tokensFrom(data);
      return tokens ? { ok: true, tokens } : { ok: false };
    },

    async signUp(email, password, redirectTo) {
      const { ok, data } = await postJson(
        "/auth/v1/signup",
        { email, password, options: { email_redirect_to: redirectTo } },
        null,
      );
      if (!ok) {
        return { ok: false };
      }
      // With email confirmation required the provider returns the user but
      // NO session: the account must not be treated as authenticated yet.
      const tokens = tokensFrom(data);
      if (tokens) {
        return { ok: true, status: "signed-in", tokens };
      }
      // GoTrue's signup response returns the user fields at the top level
      // (no `user` wrapper) when confirmation is required; accept both
      // shapes so the distinction stays provider-tolerant.
      const id =
        data["id"] ?? (data["user"] as { id?: unknown } | undefined)?.id;
      if (typeof id === "string" && UUID_LIKE.test(id)) {
        return { ok: true, status: "confirmation-required" };
      }
      return { ok: false };
    },

    async signOut(accessToken) {
      // `scope=global` revokes the session everywhere the token is used,
      // matching the provider client default. Best effort only — route
      // handlers always clear the local cookies regardless of outcome.
      try {
        await doFetch(`${baseUrl}/auth/v1/logout?scope=global`, {
          method: "POST",
          headers: {
            apikey: options.anonKey,
            authorization: `Bearer ${accessToken}`,
          },
        });
      } catch {
        // Intentionally swallowed: local sign-out must not be blocked by a
        // provider outage. Callers log the outcome server-side.
      }
    },

    async requestPasswordRecovery(email, redirectTo) {
      // The response is deliberately ignored: whether the email exists is
      // not a fact this system discloses. Callers always answer the same.
      await postJson(
        "/auth/v1/recover",
        { email, options: { email_redirect_to: redirectTo } },
        null,
      );
    },

    async updatePassword(accessToken, password) {
      let response: Response;
      try {
        response = await doFetch(`${baseUrl}/auth/v1/user`, {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            apikey: options.anonKey,
            authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ password }),
        });
      } catch {
        return false;
      }
      return response.ok;
    },

    async refresh(refreshToken) {
      const { ok, data } = await postJson(
        "/auth/v1/token?grant_type=refresh_token",
        { refresh_token: refreshToken },
        null,
      );
      if (!ok) {
        return null;
      }
      return tokensFrom(data);
    },
  };
}
