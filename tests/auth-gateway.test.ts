import { describe, expect, it } from "vitest";

import { createSupabaseAuthGateway } from "@/server/auth/auth-gateway";

/**
 * TASK-006B — Supabase Auth gateway (MOCKED provider).
 *
 * The HTTP transport is stubbed: these tests prove the gateway issues the
 * right calls and maps every provider outcome to its documented generic
 * result. They do NOT prove the real Supabase project works — no network
 * call happens and no real credential exists here.
 */

const URL = "https://project-ref.supabase.co";
const ANON = "placeholder-anon-accessor";
const USER_ID = "5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

interface RecordedCall {
  url: string;
  method: string;
  body: unknown;
}

function stubFetch(
  handler: (call: RecordedCall) => Response | Promise<Response>,
): { fetchImpl: typeof fetch; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetchImpl = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : String(input);
    let body: unknown = null;
    if (typeof init?.body === "string") {
      body = JSON.parse(init.body);
    }
    const call: RecordedCall = {
      url,
      method: init?.method ?? "GET",
      body,
    };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function sessionPayload() {
  return {
    access_token: "access-token-value",
    refresh_token: "refresh-token-value",
    expires_in: 3600,
    user: { id: USER_ID, email: "someone@example.test" },
  };
}

describe("signIn", () => {
  it("returns tokens when the provider accepts the credentials", async () => {
    const { fetchImpl, calls } = stubFetch(() =>
      jsonResponse(sessionPayload()),
    );
    const gateway = createSupabaseAuthGateway({
      url: URL,
      anonKey: ANON,
      fetchImpl,
    });

    const result = await gateway.signIn("someone@example.test", "pw");

    expect(result).toEqual({
      ok: true,
      tokens: {
        accessToken: "access-token-value",
        refreshToken: "refresh-token-value",
        expiresIn: 3600,
        userId: USER_ID,
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain("/auth/v1/token?grant_type=password");
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.body).toEqual({
      email: "someone@example.test",
      password: "pw",
    });
  });

  it("maps wrong-password and unknown-email to the same generic denial", async () => {
    const { fetchImpl } = stubFetch(() =>
      jsonResponse({ msg: "Invalid login credentials" }, 400),
    );
    const gateway = createSupabaseAuthGateway({
      url: URL,
      anonKey: ANON,
      fetchImpl,
    });

    await expect(
      gateway.signIn("someone@example.test", "wrong"),
    ).resolves.toEqual({ ok: false });
  });

  it("fails closed on provider errors and network failure", async () => {
    const boom = stubFetch(() => jsonResponse({ msg: "boom" }, 500));
    await expect(
      createSupabaseAuthGateway({
        url: URL,
        anonKey: ANON,
        fetchImpl: boom.fetchImpl,
      }).signIn("a@b.co", "pw"),
    ).resolves.toEqual({ ok: false });

    const offline = stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    await expect(
      createSupabaseAuthGateway({
        url: URL,
        anonKey: ANON,
        fetchImpl: offline.fetchImpl,
      }).signIn("a@b.co", "pw"),
    ).resolves.toEqual({ ok: false });
  });
});

describe("signUp", () => {
  it("reports confirmation-required when the provider returns a user but no session", async () => {
    const { fetchImpl, calls } = stubFetch(() =>
      jsonResponse({ id: USER_ID, email: "new@example.test" }),
    );
    const gateway = createSupabaseAuthGateway({
      url: URL,
      anonKey: ANON,
      fetchImpl,
    });

    const result = await gateway.signUp(
      "new@example.test",
      "password-123",
      "https://app.example/auth/callback",
    );

    expect(result).toEqual({ ok: true, status: "confirmation-required" });
    expect(calls[0]!.url).toContain("/auth/v1/signup");
    expect(calls[0]!.body).toEqual({
      email: "new@example.test",
      password: "password-123",
      options: { email_redirect_to: "https://app.example/auth/callback" },
    });
  });

  it("reports signed-in when the provider issues a session immediately", async () => {
    const { fetchImpl } = stubFetch(() => jsonResponse(sessionPayload()));
    const gateway = createSupabaseAuthGateway({
      url: URL,
      anonKey: ANON,
      fetchImpl,
    });

    const result = await gateway.signUp(
      "new@example.test",
      "password-123",
      "https://app.example/auth/callback",
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.status === "signed-in") {
      expect(result.tokens.userId).toBe(USER_ID);
    } else {
      throw new Error("expected signed-in result");
    }
  });

  it("fails generically on provider rejection (no enumeration detail)", async () => {
    const { fetchImpl } = stubFetch(() =>
      jsonResponse({ msg: "User already registered" }, 422),
    );
    const gateway = createSupabaseAuthGateway({
      url: URL,
      anonKey: ANON,
      fetchImpl,
    });

    await expect(
      gateway.signUp(
        "taken@example.test",
        "password-123",
        "https://app.example/auth/callback",
      ),
    ).resolves.toEqual({ ok: false });
  });
});

describe("signOut / recovery / updatePassword / refresh", () => {
  it("signOut calls the provider logout endpoint and never throws", async () => {
    const { fetchImpl, calls } = stubFetch(
      () => new Response(null, { status: 204 }),
    );
    const gateway = createSupabaseAuthGateway({
      url: URL,
      anonKey: ANON,
      fetchImpl,
    });

    await expect(gateway.signOut("some-access-token")).resolves.toBeUndefined();
    expect(calls[0]!.url).toContain("/auth/v1/logout");

    const offline = stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    await expect(
      createSupabaseAuthGateway({
        url: URL,
        anonKey: ANON,
        fetchImpl: offline.fetchImpl,
      }).signOut("token"),
    ).resolves.toBeUndefined();
  });

  it("recovery resolves identically whether the email exists or not", async () => {
    const found = stubFetch(() => jsonResponse({}));
    await expect(
      createSupabaseAuthGateway({
        url: URL,
        anonKey: ANON,
        fetchImpl: found.fetchImpl,
      }).requestPasswordRecovery(
        "real@example.test",
        "https://app.example/reset-password",
      ),
    ).resolves.toBeUndefined();

    const missing = stubFetch(() =>
      jsonResponse({ msg: "User not found" }, 422),
    );
    await expect(
      createSupabaseAuthGateway({
        url: URL,
        anonKey: ANON,
        fetchImpl: missing.fetchImpl,
      }).requestPasswordRecovery(
        "ghost@example.test",
        "https://app.example/reset-password",
      ),
    ).resolves.toBeUndefined();
    expect(missing.calls[0]!.url).toContain("/auth/v1/recover");
  });

  it("updatePassword forwards the token and returns the provider verdict", async () => {
    const okFetch = stubFetch(() => jsonResponse({ id: USER_ID }));
    await expect(
      createSupabaseAuthGateway({
        url: URL,
        anonKey: ANON,
        fetchImpl: okFetch.fetchImpl,
      }).updatePassword("access-token", "new-password-1"),
    ).resolves.toBe(true);
    expect(okFetch.calls[0]!.method).toBe("PUT");
    expect(okFetch.calls[0]!.body).toEqual({ password: "new-password-1" });

    const badFetch = stubFetch(() => jsonResponse({ msg: "weak" }, 422));
    await expect(
      createSupabaseAuthGateway({
        url: URL,
        anonKey: ANON,
        fetchImpl: badFetch.fetchImpl,
      }).updatePassword("access-token", "x"),
    ).resolves.toBe(false);
  });

  it("refresh returns fresh tokens or null when the provider refuses", async () => {
    const good = stubFetch(() => jsonResponse(sessionPayload()));
    const refreshed = await createSupabaseAuthGateway({
      url: URL,
      anonKey: ANON,
      fetchImpl: good.fetchImpl,
    }).refresh("old-refresh");
    expect(refreshed?.accessToken).toBe("access-token-value");

    const dead = stubFetch(() => jsonResponse({ msg: "expired" }, 401));
    await expect(
      createSupabaseAuthGateway({
        url: URL,
        anonKey: ANON,
        fetchImpl: dead.fetchImpl,
      }).refresh("dead-refresh"),
    ).resolves.toBeNull();
  });
});
