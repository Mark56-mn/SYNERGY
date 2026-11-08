import { describe, expect, it } from "vitest";

import {
  SupabaseSessionSource,
  bearerTokenOf,
  type Session,
} from "@/server/auth/session";
import {
  createSupabaseTokenVerifier,
  type TokenVerifier,
  type VerifiedIdentity,
} from "@/server/auth/supabase-session";

/**
 * TASK-006A — Supabase Auth session boundary.
 *
 * SCOPE OF EVIDENCE, stated plainly: these tests exercise the REAL verifier
 * code path (`createSupabaseTokenVerifier` → `supabase.auth.getUser`) with the
 * HTTP transport replaced by a deterministic stub, and the REAL session
 * source with an injected verifier. They prove:
 *
 *   - deny-by-default for absent, malformed and unacceptable tokens;
 *   - the identity used downstream is the PROVIDER-VERIFIED user id only;
 *   - provider errors, network failures and invalid identity responses fail closed;
 *   - provider error details are discarded by the verifier rather than returned;
 *   - client-asserted identity and roles are never merged in.
 *
 * These tests do not instrument the application's complete logging/HTTP
 * response pipeline, so they are not proof of system-wide token non-disclosure.
 *
 * They do NOT prove live integration against a Supabase project: the HTTP
 * transport is stubbed, even though the implementation agent reports that
 * project configuration and negative-path provider checks were exercised
 * separately. A passing run here must never be reported as "Supabase
 * authentication works"; the positive real-user path remains B-7b.
 */

const USER_ID = "5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const OTHER_ID = "9a8b7c6d-5e4f-4a3b-8c1d-2e3f4a5b6c7d";
const PROJECT_URL = "https://project-ref.supabase.co";
const ANON_KEY = "placeholder-accessor-not-a-real-key";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

interface FetchCall {
  url: string;
  authorization: string | null;
}

/** Build a transport stub that records what the provider call sent. */
function stubFetch(
  handler: (call: FetchCall) => Response | Promise<Response>,
): { fetchImpl: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchImpl = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : String(input);
    const headers = new Headers(init?.headers ?? {});
    const call: FetchCall = {
      url,
      authorization: headers.get("authorization"),
    };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function userPayload(id: string) {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "someone@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
}

describe("Supabase token verifier: provider-verified identity only", () => {
  it("returns the provider's user id for a token the provider accepts", async () => {
    const { fetchImpl, calls } = stubFetch(() =>
      jsonResponse(userPayload(USER_ID)),
    );
    const verifier = createSupabaseTokenVerifier({
      url: PROJECT_URL,
      anonKey: ANON_KEY,
      fetchImpl,
    });

    await expect(verifier.verify("header.payload.signature")).resolves.toEqual({
      id: USER_ID,
    });

    // The provider call carries the presented token as a bearer credential to
    // the project's own user endpoint — verification is NOT done in-process.
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain("/auth/v1/user");
    expect(calls[0]!.authorization).toBe("Bearer header.payload.signature");
  });

  it("rejects a token the provider refuses (401) without distinguishing why", async () => {
    const { fetchImpl } = stubFetch(() =>
      jsonResponse({ code: 401, msg: "invalid JWT" }, 401),
    );
    const verifier = createSupabaseTokenVerifier({
      url: PROJECT_URL,
      anonKey: ANON_KEY,
      fetchImpl,
    });

    await expect(
      verifier.verify("forged.or.expired.token"),
    ).resolves.toBeNull();
  });

  it("fails closed when the provider errors (500) or is unreachable", async () => {
    const serverError = stubFetch(() => jsonResponse({ msg: "boom" }, 500));
    await expect(
      createSupabaseTokenVerifier({
        url: PROJECT_URL,
        anonKey: ANON_KEY,
        fetchImpl: serverError.fetchImpl,
      }).verify("any.token.value"),
    ).resolves.toBeNull();

    const offline = stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    await expect(
      createSupabaseTokenVerifier({
        url: PROJECT_URL,
        anonKey: ANON_KEY,
        fetchImpl: offline.fetchImpl,
      }).verify("any.token.value"),
    ).resolves.toBeNull();
  });

  it("never calls the provider for an empty or whitespace-only token", async () => {
    const { fetchImpl, calls } = stubFetch(() =>
      jsonResponse(userPayload(USER_ID)),
    );
    const verifier = createSupabaseTokenVerifier({
      url: PROJECT_URL,
      anonKey: ANON_KEY,
      fetchImpl,
    });

    await expect(verifier.verify("")).resolves.toBeNull();
    await expect(verifier.verify("   ")).resolves.toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("rejects a provider response whose id is not a UUID", async () => {
    const { fetchImpl } = stubFetch(() =>
      jsonResponse(userPayload("not-a-uuid")),
    );
    const verifier = createSupabaseTokenVerifier({
      url: PROJECT_URL,
      anonKey: ANON_KEY,
      fetchImpl,
    });

    await expect(verifier.verify("valid.looking.token")).resolves.toBeNull();
  });
});

describe("session resolution through the Supabase source", () => {
  /** Contract double: maps a presented token to a provider-verified identity. */
  function verifierOf(
    map: Record<string, VerifiedIdentity | null>,
  ): TokenVerifier {
    return {
      async verify(token: string) {
        return map[token] ?? null;
      },
    };
  }

  function sourceOf(map: Record<string, VerifiedIdentity | null>) {
    return new SupabaseSessionSource({
      readBearerToken: (request) => bearerTokenOf(request),
      verify: (token) => verifierOf(map).verify(token),
    });
  }

  function request(authorization?: string): Request {
    const headers = new Headers();
    if (authorization) {
      headers.set("authorization", authorization);
    }
    return new Request("http://localhost:3000/api/v1/owned-items", { headers });
  }

  it("no Authorization header resolves to no session", async () => {
    const source = sourceOf({ token: { id: USER_ID } });
    await expect(source.getSession(request())).resolves.toBeNull();
  });

  it("a non-Bearer scheme resolves to no session", async () => {
    const source = sourceOf({ token: { id: USER_ID } });
    await expect(
      source.getSession(request("Basic dXNlcjpwYXNz")),
    ).resolves.toBeNull();
  });

  it("an empty Bearer value resolves to no session", async () => {
    const source = sourceOf({ token: { id: USER_ID } });
    await expect(source.getSession(request("Bearer   "))).resolves.toBeNull();
  });

  it("a rejected token resolves to no session", async () => {
    const source = sourceOf({ "good.token": { id: USER_ID } });
    await expect(
      source.getSession(request("Bearer malformed.token")),
    ).resolves.toBeNull();
  });

  it("a verified token resolves to that user with the foundation role only", async () => {
    const source = sourceOf({ "good.token": { id: USER_ID } });
    const session = await source.getSession(request("Bearer good.token"));

    expect(session).not.toBeNull();
    expect(session!.userId).toBe(USER_ID);
    // Roles come from the verified source's fixed foundation default; no
    // client-supplied role or privilege field is consulted anywhere.
    expect(session!.roles).toEqual(["member"]);
  });

  it("does not reuse one user's identity for another token", async () => {
    const source = sourceOf({
      "a.token": { id: USER_ID },
      "b.token": { id: OTHER_ID },
    });

    const a = await source.getSession(request("Bearer a.token"));
    const b = await source.getSession(request("Bearer b.token"));

    expect(a!.userId).toBe(USER_ID);
    expect(b!.userId).toBe(OTHER_ID);
    expect(a!.userId).not.toBe(b!.userId);
  });

  it("a client-supplied user id in the body or query never becomes the session", async () => {
    const source = sourceOf({ "a.token": { id: USER_ID } });

    const crafted = new Request(
      `http://localhost:3000/api/v1/owned-items?user_id=${OTHER_ID}`,
      {
        method: "POST",
        headers: {
          authorization: "Bearer a.token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: OTHER_ID,
          ownerId: OTHER_ID,
          role: "moderator",
        }),
      },
    );

    const session = (await source.getSession(crafted)) as Session;
    expect(session.userId).toBe(USER_ID);
    expect(session.roles).toEqual(["member"]);
  });
});
