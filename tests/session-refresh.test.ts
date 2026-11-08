import { describe, expect, it } from "vitest";

import {
  decodeJwtExpiry,
  refreshSessionIfNeeded,
} from "@/server/auth/session-refresh";

/**
 * TASK-006B — session-refresh decisions (MOCKED provider).
 *
 * The JWTs below are hand-built UNSIGNED strings: only the `exp` claim is
 * read, for refresh timing. No test here treats them as authenticated
 * anything — downstream provider verification still applies.
 */

function unsignedJwt(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
    "base64url",
  );
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString(
    "base64url",
  );
  return `${header}.${payload}.signature`;
}

const URL = "https://project-ref.supabase.co";
const ANON = "placeholder-anon";
const NOW = 1_700_000_000;

function stubFetch(handler: () => Response | Promise<Response>) {
  const calls: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return handler();
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function refreshPayload() {
  return new Response(
    JSON.stringify({
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 3600,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("decodeJwtExpiry", () => {
  it("reads the exp claim from a well-formed token", () => {
    expect(decodeJwtExpiry(unsignedJwt(NOW + 3600))).toBe(NOW + 3600);
  });

  it("returns null for malformed tokens", () => {
    expect(decodeJwtExpiry("")).toBeNull();
    expect(decodeJwtExpiry("not-a-jwt")).toBeNull();
    expect(decodeJwtExpiry("a.b.c")).toBeNull();
  });
});

describe("refreshSessionIfNeeded", () => {
  it("is anonymous when there is no refresh token", async () => {
    const { fetchImpl, calls } = stubFetch(() => refreshPayload());
    const result = await refreshSessionIfNeeded({
      accessToken: null,
      refreshToken: null,
      url: URL,
      anonKey: ANON,
      fetchImpl,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ kind: "anonymous" });
    expect(calls).toHaveLength(0);
  });

  it("leaves a fresh access token alone (no provider call)", async () => {
    const { fetchImpl, calls } = stubFetch(() => refreshPayload());
    const result = await refreshSessionIfNeeded({
      accessToken: unsignedJwt(NOW + 1800),
      refreshToken: "refresh",
      url: URL,
      anonKey: ANON,
      fetchImpl,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ kind: "fresh" });
    expect(calls).toHaveLength(0);
  });

  it("refreshes an expired access token", async () => {
    const { fetchImpl, calls } = stubFetch(() => refreshPayload());
    const result = await refreshSessionIfNeeded({
      accessToken: unsignedJwt(NOW - 10),
      refreshToken: "refresh",
      url: URL,
      anonKey: ANON,
      fetchImpl,
      nowSeconds: NOW,
    });
    expect(result).toEqual({
      kind: "refreshed",
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresIn: 3600,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("grant_type=refresh_token");
  });

  it("refreshes when the access token is missing but a refresh token exists", async () => {
    const { fetchImpl } = stubFetch(() => refreshPayload());
    const result = await refreshSessionIfNeeded({
      accessToken: null,
      refreshToken: "refresh",
      url: URL,
      anonKey: ANON,
      fetchImpl,
      nowSeconds: NOW,
    });
    expect(result.kind).toBe("refreshed");
  });

  it("clears the session when the provider refuses the refresh token", async () => {
    const { fetchImpl } = stubFetch(
      () =>
        new Response(JSON.stringify({ msg: "expired" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
    );
    const result = await refreshSessionIfNeeded({
      accessToken: unsignedJwt(NOW - 10),
      refreshToken: "dead",
      url: URL,
      anonKey: ANON,
      fetchImpl,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ kind: "clear" });
  });

  it("keeps cookies untouched when the provider is unreachable", async () => {
    const { fetchImpl } = stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    const result = await refreshSessionIfNeeded({
      accessToken: unsignedJwt(NOW - 10),
      refreshToken: "refresh",
      url: URL,
      anonKey: ANON,
      fetchImpl,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ kind: "unavailable" });
  });
});
