import { describe, expect, it } from "vitest";

import { SupabaseSessionSource, bearerTokenOf } from "@/server/auth/session";
import { ACCESS_COOKIE, parseCookies } from "@/server/auth/cookies";

/**
 * TASK-006B — cookie-backed session resolution (MOCKED verifier).
 *
 * The verifier is an in-memory stub keyed by token string. These tests prove
 * precedence (Bearer wins over cookie), cookie fallback, and fail-closed
 * behaviour — not live provider verification.
 */

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function sourceWith(validTokens: Record<string, string>) {
  return new SupabaseSessionSource({
    readBearerToken: (request) => bearerTokenOf(request),
    readAccessTokenFromCookie: (request) =>
      parseCookies(request.headers.get("cookie")).get(ACCESS_COOKIE) ?? null,
    verify: async (token) =>
      validTokens[token] ? { id: validTokens[token]! } : null,
  });
}

function request(options: {
  authorization?: string;
  cookie?: string;
}): Request {
  const headers = new Headers();
  if (options.authorization) {
    headers.set("authorization", options.authorization);
  }
  if (options.cookie) {
    headers.set("cookie", options.cookie);
  }
  return new Request("http://localhost:3000/api/v1/owned-items", { headers });
}

describe("cookie-backed session resolution", () => {
  it("resolves a verified cookie session with no Bearer header", async () => {
    const source = sourceWith({ "cookie-token": USER_A });
    const session = await source.getSession(
      request({ cookie: `synergy_access_token=cookie-token` }),
    );
    expect(session?.userId).toBe(USER_A);
    expect(session?.roles).toEqual(["member"]);
  });

  it("prefers the Bearer header when both are present", async () => {
    const source = sourceWith({
      "bearer-token": USER_A,
      "cookie-token": USER_B,
    });
    const session = await source.getSession(
      request({
        authorization: "Bearer bearer-token",
        cookie: "synergy_access_token=cookie-token",
      }),
    );
    expect(session?.userId).toBe(USER_A);
  });

  it("denies when neither header nor cookie is present", async () => {
    const source = sourceWith({ "cookie-token": USER_A });
    await expect(source.getSession(request({}))).resolves.toBeNull();
  });

  it("denies a forged cookie token", async () => {
    const source = sourceWith({ "real-token": USER_A });
    await expect(
      source.getSession(
        request({ cookie: "synergy_access_token=forged-token" }),
      ),
    ).resolves.toBeNull();
  });

  it("ignores other cookies and tolerates a malformed cookie header", async () => {
    const source = sourceWith({ "cookie-token": USER_A });
    const session = await source.getSession(
      request({ cookie: "theme=dark; synergy_access_token=cookie-token; x" }),
    );
    expect(session?.userId).toBe(USER_A);
  });
});

describe("originMatchesHost", () => {
  it("matches Origin against the Host header, not the synthesized URL host", async () => {
    const { originMatchesHost } = await import("@/server/auth/origin");
    // Next dev synthesizes request.url with host 0.0.0.0 while Host carries
    // the real hostname (regression observed live 2026-11-08).
    const headers = new Headers();
    headers.set("origin", "http://localhost:3100");
    headers.set("host", "localhost:3100");
    const request = new Request("http://0.0.0.0:3100/api/v1/auth/logout", {
      method: "POST",
      headers,
    });
    expect(originMatchesHost(request)).toBe(true);
  });

  it("rejects a cross-site origin", async () => {
    const { originMatchesHost } = await import("@/server/auth/origin");
    const headers = new Headers();
    headers.set("origin", "https://evil.example");
    headers.set("host", "localhost:3100");
    const request = new Request("http://localhost:3100/api/v1/auth/logout", {
      method: "POST",
      headers,
    });
    expect(originMatchesHost(request)).toBe(false);
  });
});
