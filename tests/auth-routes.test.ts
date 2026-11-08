import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { AuthGateway, AuthTokens } from "@/server/auth/auth-gateway";
import type { SessionSource } from "@/server/auth/session";
import { resetEnvCacheForTests } from "@/server/env";
import { createEstablishRoute } from "@/app/api/v1/auth/establish/route";
import { createForgotPasswordRoute } from "@/app/api/v1/auth/forgot-password/route";
import { createLoginRoute } from "@/app/api/v1/auth/login/route";
import { createLogoutRoute } from "@/app/api/v1/auth/logout/route";
import { createRegisterRoute } from "@/app/api/v1/auth/register/route";
import { createUpdatePasswordRoute } from "@/app/api/v1/auth/update-password/route";

/**
 * TASK-006B — auth API routes (MOCKED provider + stub session source).
 *
 * The gateway is an in-memory stub and the session source is a labelled
 * test double, so these prove route behaviour (status codes, cookie flags,
 * generic messages, CSRF/origin checks, identity handling) — they do NOT
 * prove the real Supabase project works.
 */

const USER_ID = "5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const TOKENS: AuthTokens = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresIn: 3600,
  userId: USER_ID,
};

const ORIGIN = "http://localhost:3000";

function stubGateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    signIn: async () => ({ ok: true, tokens: TOKENS }),
    signUp: async () => ({
      ok: true,
      status: "confirmation-required" as const,
    }),
    signOut: async () => undefined,
    requestPasswordRecovery: async () => undefined,
    updatePassword: async () => true,
    refresh: async () => TOKENS,
    ...overrides,
  };
}

const nullSource: SessionSource = { getSession: async () => null };

function sessionSourceFor(
  sessions: Record<string, { userId: string }>,
): SessionSource {
  return {
    async getSession(request: Request) {
      const header = request.headers.get("authorization") ?? "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;
      const found = token ? sessions[token] : undefined;
      return found ? { userId: found.userId, roles: ["member"] } : null;
    },
  };
}

function postJson(
  path: string,
  body: unknown,
  headers: Headers = new Headers(),
): Request {
  headers.set("content-type", "application/json");
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function sameOriginHeaders(): Headers {
  const headers = new Headers();
  headers.set("origin", ORIGIN);
  return headers;
}

beforeEach(() => {
  process.env["SUPABASE_AUTH_URL"] = "https://project-ref.supabase.co";
  process.env["SUPABASE_AUTH_ANON_KEY"] = "placeholder-anon";
  resetEnvCacheForTests();
});

afterEach(() => {
  delete process.env["SUPABASE_AUTH_URL"];
  delete process.env["SUPABASE_AUTH_ANON_KEY"];
  resetEnvCacheForTests();
});

function readSetCookie(response: Response): string {
  return response.headers.get("set-cookie") ?? "";
}

describe("POST /api/v1/auth/login", () => {
  it("sets HttpOnly session cookies and returns the safe destination", async () => {
    const route = createLoginRoute({
      gateway: stubGateway(),
      sessionSource: nullSource,
    });

    const response = await route(
      postJson("/api/v1/auth/login", {
        email: "someone@example.test",
        password: "password-123",
        next: "/account",
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; next: string };
    expect(body).toEqual({ ok: true, next: "/account" });
    const cookies = readSetCookie(response);
    expect(cookies).toContain("synergy_access_token=access-token");
    expect(cookies).toContain("synergy_refresh_token=refresh-token");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("SameSite=Lax");
    expect(JSON.stringify(body)).not.toContain("access-token");
  });

  it("returns the same generic 401 for bad credentials", async () => {
    const route = createLoginRoute({
      gateway: stubGateway({ signIn: async () => ({ ok: false }) }),
      sessionSource: nullSource,
    });

    const response = await route(
      postJson("/api/v1/auth/login", {
        email: "someone@example.test",
        password: "wrong",
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "unauthorized", message: "Invalid email or password." },
    });
  });

  it("rejects invalid input without calling the provider", async () => {
    let called = false;
    const route = createLoginRoute({
      gateway: stubGateway({
        signIn: async () => {
          called = true;
          return { ok: true, tokens: TOKENS };
        },
      }),
      sessionSource: nullSource,
    });

    const response = await route(
      postJson("/api/v1/auth/login", { email: "not-an-email", password: "x" }),
    );
    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });

  it("sanitizes a hostile next value server-side", async () => {
    const route = createLoginRoute({
      gateway: stubGateway(),
      sessionSource: nullSource,
    });
    const response = await route(
      postJson("/api/v1/auth/login", {
        email: "a@b.co",
        password: "pw",
        next: "https://evil.example/steal",
      }),
    );
    expect(((await response.json()) as { next: string }).next).toBe("/");
  });
});

describe("POST /api/v1/auth/register", () => {
  it("does not authenticate the user when confirmation is required", async () => {
    const route = createRegisterRoute({
      gateway: stubGateway(),
      sessionSource: nullSource,
    });

    const response = await route(
      postJson("/api/v1/auth/register", {
        email: "new@example.test",
        password: "password-123",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      status: "confirmation-required",
    });
    expect(readSetCookie(response)).not.toContain("synergy_access_token");
  });

  it("sets cookies when the provider signs the user in immediately", async () => {
    const route = createRegisterRoute({
      gateway: stubGateway({
        signUp: async () => ({ ok: true, status: "signed-in", tokens: TOKENS }),
      }),
      sessionSource: nullSource,
    });

    const response = await route(
      postJson("/api/v1/auth/register", {
        email: "new@example.test",
        password: "password-123",
      }),
    );

    expect(await response.json()).toEqual({ ok: true, status: "signed-in" });
    expect(readSetCookie(response)).toContain("synergy_access_token");
  });

  it("rejects weak passwords before calling the provider", async () => {
    let called = false;
    const route = createRegisterRoute({
      gateway: stubGateway({
        signUp: async () => {
          called = true;
          return { ok: true, status: "confirmation-required" as const };
        },
      }),
      sessionSource: nullSource,
    });

    const response = await route(
      postJson("/api/v1/auth/register", {
        email: "new@example.test",
        password: "short",
      }),
    );
    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });

  it("returns a generic failure that never reveals a taken email", async () => {
    const route = createRegisterRoute({
      gateway: stubGateway({ signUp: async () => ({ ok: false }) }),
      sessionSource: nullSource,
    });

    const response = await route(
      postJson("/api/v1/auth/register", {
        email: "taken@example.test",
        password: "password-123",
      }),
    );

    expect(response.status).toBe(400);
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain("taken@example.test");
    expect(body).not.toMatch(/already registered/i);
  });
});

describe("POST /api/v1/auth/forgot-password", () => {
  it("answers identically for existing and missing accounts", async () => {
    for (const gateway of [
      stubGateway(),
      stubGateway({
        requestPasswordRecovery: async () => undefined,
      }),
    ]) {
      const route = createForgotPasswordRoute({
        gateway,
        sessionSource: nullSource,
      });
      const response = await route(
        postJson("/api/v1/auth/forgot-password", {
          email: "anyone@example.test",
        }),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        ok: true,
        message:
          "If an account exists for that email, a password reset link is on its way.",
      });
    }
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("clears both session cookies and revokes provider-side", async () => {
    let revoked: string | null = null;
    const route = createLogoutRoute({
      gateway: stubGateway({
        signOut: async (token) => {
          revoked = token;
        },
      }),
      sessionSource: sessionSourceFor({ "access-token": { userId: USER_ID } }),
    });

    const headers = sameOriginHeaders();
    headers.set("authorization", "Bearer access-token");
    const response = await route(postJson("/api/v1/auth/logout", {}, headers));

    expect(response.status).toBe(200);
    expect(revoked).toBe("access-token");
    const cookies = readSetCookie(response);
    expect(cookies).toContain("synergy_access_token=");
    expect(cookies).toContain("Max-Age=0");
    expect(cookies).toContain("synergy_refresh_token=");
  });

  it("requires a same-origin browser request (CSRF)", async () => {
    const route = createLogoutRoute({
      gateway: stubGateway(),
      sessionSource: nullSource,
    });
    const headers = new Headers();
    headers.set("origin", "https://evil.example");
    const response = await route(postJson("/api/v1/auth/logout", {}, headers));
    expect(response.status).toBe(403);
  });

  it("still succeeds locally when the provider sign-out throws", async () => {
    const route = createLogoutRoute({
      gateway: stubGateway({
        signOut: async () => {
          throw new Error("provider down");
        },
      }),
      sessionSource: nullSource,
    });
    const response = await route(
      postJson("/api/v1/auth/logout", {}, sameOriginHeaders()),
    );
    expect(response.status).toBe(200);
    expect(readSetCookie(response)).toContain("Max-Age=0");
  });
});

describe("POST /api/v1/auth/update-password", () => {
  it("updates the password for a verified session", async () => {
    const route = createUpdatePasswordRoute({
      gateway: stubGateway(),
      sessionSource: sessionSourceFor({ "access-token": { userId: USER_ID } }),
    });
    const headers = sameOriginHeaders();
    headers.set("authorization", "Bearer access-token");

    const response = await route(
      postJson(
        "/api/v1/auth/update-password",
        { password: "new-password-1" },
        headers,
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("denies unauthenticated callers (expired recovery link)", async () => {
    const route = createUpdatePasswordRoute({
      gateway: stubGateway(),
      sessionSource: nullSource,
    });
    const response = await route(
      postJson(
        "/api/v1/auth/update-password",
        { password: "new-password-1" },
        sameOriginHeaders(),
      ),
    );
    expect(response.status).toBe(401);
  });
});

describe("POST /api/v1/auth/establish", () => {
  const verifier = {
    async verify(token: string) {
      return token === "good-token" ? { id: USER_ID } : null;
    },
  };

  it("verifies the fragment token and sets cookies only on success", async () => {
    const route = createEstablishRoute({
      gateway: stubGateway(),
      verifier,
      sessionSource: nullSource,
    });

    const good = await route(
      postJson(
        "/api/v1/auth/establish",
        { accessToken: "good-token", refreshToken: "refresh-token" },
        sameOriginHeaders(),
      ),
    );
    expect(good.status).toBe(200);
    expect(readSetCookie(good)).toContain("synergy_access_token=");

    const bad = await route(
      postJson(
        "/api/v1/auth/establish",
        { accessToken: "forged-token" },
        sameOriginHeaders(),
      ),
    );
    expect(bad.status).toBe(401);
    expect(readSetCookie(bad)).not.toContain("synergy_access_token");
  });

  it("requires a same-origin Origin header", async () => {
    const route = createEstablishRoute({
      gateway: stubGateway(),
      verifier,
      sessionSource: nullSource,
    });
    const response = await route(
      postJson("/api/v1/auth/establish", { accessToken: "good-token" }),
    );
    expect(response.status).toBe(403);
  });
});
