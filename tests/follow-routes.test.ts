import { beforeEach, describe, expect, it } from "vitest";

import { createFollowRoute } from "@/app/api/v1/profiles/[username]/follow/route";
import { createSocialGraphService } from "@/modules/social-graph/service";
import type { SessionSource } from "@/server/auth/session";
import { createInMemoryRateLimiter } from "@/server/ratelimit";

import { createInMemorySocialGraphRepository } from "./helpers/social-graph-double";

/**
 * TASK-008D HTTP surfaces: auth, CSRF, privacy, idempotency and rate limits.
 * The repository is an in-memory double; live Neon behaviour is in
 * `scripts/follows-live-check.mjs`.
 */

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb";
const USER_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ORIGIN = "http://localhost:3000";

const sessionSource: SessionSource = {
  async getSession(request) {
    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    const userId =
      token === "token-a" ? USER_A : token === "token-b" ? USER_B : null;
    return userId ? { userId, roles: ["member"] } : null;
  },
};

let repository: ReturnType<typeof createInMemorySocialGraphRepository>;
let service: ReturnType<typeof createSocialGraphService>;

beforeEach(() => {
  repository = createInMemorySocialGraphRepository({
    targets: [
      { identityId: USER_A, username: "ada_okoro" },
      { identityId: USER_B, username: "bola_okoro" },
      { identityId: USER_C, username: "chi_okoro", visibility: "private" },
    ],
    profiles: [USER_A, USER_B, USER_C],
  });
  service = createSocialGraphService(repository);
});

function request(
  path: string,
  options: {
    method?: string;
    token?: string;
    origin?: string;
    body?: string;
  } = {},
): Request {
  const headers = new Headers();
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  headers.set("origin", options.origin ?? ORIGIN);
  return new Request(`${ORIGIN}${path}`, {
    method: options.method ?? "POST",
    headers,
    body: options.body,
  });
}

const params = (username: string) => ({
  params: Promise.resolve({ username }),
});

function route(
  following: boolean,
  limiter?: ReturnType<typeof createInMemoryRateLimiter>,
) {
  return createFollowRoute({ sessionSource, service, limiter }, following);
}

describe("POST/DELETE /api/v1/profiles/[username]/follow", () => {
  it("denies anonymous callers before writing", async () => {
    const response = await route(true)(
      request("/api/v1/profiles/bola_okoro/follow"),
      params("bola_okoro"),
    );
    expect(response.status).toBe(401);
    expect(repository.edges.size).toBe(0);
  });

  it("denies anonymous unfollow", async () => {
    const response = await route(false)(
      request("/api/v1/profiles/bola_okoro/follow", { method: "DELETE" }),
      params("bola_okoro"),
    );
    expect(response.status).toBe(401);
  });

  it("requires a same-origin request (CSRF)", async () => {
    const response = await route(true)(
      request("/api/v1/profiles/bola_okoro/follow", {
        token: "token-a",
        origin: "https://evil.example",
      }),
      params("bola_okoro"),
    );
    expect(response.status).toBe(403);
    expect(repository.edges.size).toBe(0);
  });

  it("follows for the verified caller and returns a no-store allowlist", async () => {
    const response = await route(true)(
      request("/api/v1/profiles/bola_okoro/follow", { token: "token-a" }),
      params("bola_okoro"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({
      isFollowing: true,
      followerCount: 1,
      followingCount: 0,
    });
    expect(Object.keys(body).sort()).toEqual([
      "followerCount",
      "followingCount",
      "isFollowing",
    ]);
    expect(JSON.stringify(body)).not.toContain(USER_A);
    expect(JSON.stringify(body)).not.toContain(USER_B);
    expect(repository.edgeCount(USER_A, USER_B)).toBe(1);
  });

  it("is idempotent across repeated follows", async () => {
    const follow = route(true);
    const make = () =>
      request("/api/v1/profiles/bola_okoro/follow", { token: "token-a" });
    expect((await follow(make(), params("bola_okoro"))).status).toBe(200);
    expect((await follow(make(), params("bola_okoro"))).status).toBe(200);
    expect(repository.edges.size).toBe(1);
  });

  it("cannot name an actor in a body", async () => {
    const response = await route(true)(
      request("/api/v1/profiles/bola_okoro/follow", {
        token: "token-a",
        body: JSON.stringify({ followerIdentityId: USER_C }),
      }),
      params("bola_okoro"),
    );
    expect(response.status).toBe(200);
    expect(repository.edgeCount(USER_A, USER_B)).toBe(1);
    expect(repository.edgeCount(USER_C, USER_B)).toBe(0);
  });

  it("answers missing and private targets with identical 404 bodies", async () => {
    const follow = route(true);
    const missing = await follow(
      request("/api/v1/profiles/nobody_here/follow", { token: "token-a" }),
      params("nobody_here"),
    );
    const privateTarget = await follow(
      request("/api/v1/profiles/chi_okoro/follow", { token: "token-a" }),
      params("chi_okoro"),
    );

    expect(missing.status).toBe(404);
    expect(privateTarget.status).toBe(404);
    expect(await missing.text()).toBe(await privateTarget.text());
    expect(repository.edges.size).toBe(0);
  });

  it("rejects self-follow with 400", async () => {
    const response = await route(true)(
      request("/api/v1/profiles/ada_okoro/follow", { token: "token-a" }),
      params("ada_okoro"),
    );
    expect(response.status).toBe(400);
    expect(repository.edges.size).toBe(0);
  });

  it("rate-limits follow writes per actor", async () => {
    const limiter = createInMemoryRateLimiter({
      maxPerWindow: 2,
      windowSeconds: 60,
    });
    const follow = route(true, limiter);
    const make = () =>
      request("/api/v1/profiles/bola_okoro/follow", { token: "token-a" });
    expect((await follow(make(), params("bola_okoro"))).status).toBe(200);
    expect((await follow(make(), params("bola_okoro"))).status).toBe(200);
    expect((await follow(make(), params("bola_okoro"))).status).toBe(429);
  });

  it("removes only the caller's edge on unfollow", async () => {
    repository.edges.add(`${USER_A}|${USER_B}`);
    repository.edges.add(`${USER_C}|${USER_B}`);
    const response = await route(false)(
      request("/api/v1/profiles/bola_okoro/follow", {
        method: "DELETE",
        token: "token-a",
      }),
      params("bola_okoro"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      isFollowing: false,
      followerCount: 1,
      followingCount: 0,
    });
    expect(repository.edgeCount(USER_A, USER_B)).toBe(0);
    expect(repository.edgeCount(USER_C, USER_B)).toBe(1);
  });

  it("allows unfollowing a creator who became private when an edge exists", async () => {
    repository.edges.add(`${USER_A}|${USER_C}`);
    const response = await route(false)(
      request("/api/v1/profiles/chi_okoro/follow", {
        method: "DELETE",
        token: "token-a",
      }),
      params("chi_okoro"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.isFollowing).toBe(false);
    // Suppressed, not fabricated: a private target's counts stay null on the
    // wire rather than leaking or appearing as 0.
    expect(body.followerCount).toBeNull();
    expect(body.followingCount).toBeNull();
    expect(repository.edgeCount(USER_A, USER_C)).toBe(0);
  });

  it("answers private and missing targets identically on unfollow without an edge", async () => {
    const unfollow = route(false);
    const missing = await unfollow(
      request("/api/v1/profiles/nobody_here/follow", {
        method: "DELETE",
        token: "token-a",
      }),
      params("nobody_here"),
    );
    const privateTarget = await unfollow(
      request("/api/v1/profiles/chi_okoro/follow", {
        method: "DELETE",
        token: "token-a",
      }),
      params("chi_okoro"),
    );

    expect(missing.status).toBe(404);
    expect(privateTarget.status).toBe(404);
    expect(await missing.text()).toBe(await privateTarget.text());
    expect(repository.edges.size).toBe(0);
  });
});
