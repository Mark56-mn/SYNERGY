import { describe, expect, it } from "vitest";

import { createAvatarCleanupRoute } from "@/app/api/v1/profile/avatar-cleanup/route";
import type { SessionSource } from "@/server/auth/session";
import { createInMemoryRateLimiter } from "@/server/ratelimit";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb";
const ORIGIN = "http://localhost:3000";
const CONFIG = {
  url: "https://example.supabase.co",
  secretKey: "secret",
  bucket: "profile-photos",
};

function sessionSourceFor(tokens: Record<string, string>): SessionSource {
  return {
    async getSession(request: Request) {
      const header = request.headers.get("authorization") ?? "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;
      const userId = token ? tokens[token] : undefined;
      return userId ? { userId, roles: ["member"] } : null;
    },
  };
}

const nullSource: SessionSource = { getSession: async () => null };

function authed(token?: string, origin = ORIGIN): Headers {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  headers.set("origin", origin);
  headers.set("content-type", "application/json");
  return headers;
}

describe("POST /api/v1/profile/avatar-cleanup", () => {
  it("denies anonymous callers", async () => {
    const route = createAvatarCleanupRoute({
      sessionSource: nullSource,
      readConfig: () => CONFIG,
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profile/avatar-cleanup`, {
        method: "POST",
        headers: authed(),
        body: JSON.stringify({ avatarUrl: `${USER_A}/pending.png` }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("requires same origin", async () => {
    const route = createAvatarCleanupRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      readConfig: () => CONFIG,
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profile/avatar-cleanup`, {
        method: "POST",
        headers: authed("token-a", "https://evil.example"),
        body: JSON.stringify({ avatarUrl: `${USER_A}/pending.png` }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects cross-member deletion attempts", async () => {
    const deleted: string[] = [];
    const route = createAvatarCleanupRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      readConfig: () => CONFIG,
      deleteObject: async (_config, path) => {
        deleted.push(path);
      },
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profile/avatar-cleanup`, {
        method: "POST",
        headers: authed("token-a"),
        body: JSON.stringify({ avatarUrl: `${USER_B}/pending.png` }),
      }),
    );
    expect(response.status).toBe(403);
    expect(deleted).toHaveLength(0);
  });

  it("deletes an owned pending path", async () => {
    const deleted: string[] = [];
    const route = createAvatarCleanupRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      readConfig: () => CONFIG,
      deleteObject: async (_config, path) => {
        deleted.push(path);
      },
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profile/avatar-cleanup`, {
        method: "POST",
        headers: authed("token-a"),
        body: JSON.stringify({ avatarUrl: `${USER_A}/pending.png` }),
      }),
    );
    expect(response.status).toBe(200);
    expect(deleted).toEqual([`${USER_A}/pending.png`]);
  });

  it("is idempotent when deletion throws", async () => {
    let calls = 0;
    const route = createAvatarCleanupRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      readConfig: () => CONFIG,
      deleteObject: async () => {
        calls += 1;
        throw new Error("missing");
      },
    });
    const make = () =>
      route(
        new Request(`${ORIGIN}/api/v1/profile/avatar-cleanup`, {
          method: "POST",
          headers: authed("token-a"),
          body: JSON.stringify({ avatarUrl: `${USER_A}/pending.png` }),
        }),
      );
    const first = await make();
    const second = await make();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(calls).toBe(2);
  });

  it("returns 503 when media is not configured", async () => {
    const route = createAvatarCleanupRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      readConfig: () => null,
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profile/avatar-cleanup`, {
        method: "POST",
        headers: authed("token-a"),
        body: JSON.stringify({ avatarUrl: `${USER_A}/pending.png` }),
      }),
    );
    expect(response.status).toBe(503);
  });
});

describe("TASK-007G3 cleanup safety", () => {
  it("fails closed when the current profile cannot be read", async () => {
    const deleted: string[] = [];
    const route = createAvatarCleanupRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      readConfig: () => CONFIG,
      deleteObject: async (_config, path) => {
        deleted.push(path);
      },
      service: {
        getOwnProfile: async () => {
          throw new Error("database unavailable");
        },
      } as never,
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profile/avatar-cleanup`, {
        method: "POST",
        headers: authed("token-a"),
        body: JSON.stringify({ avatarUrl: `${USER_A}/pending.png` }),
      }),
    );
    expect(response.status).toBe(500);
    expect(deleted).toHaveLength(0);
  });

  it("protects a saved avatar even when stored as a URL and submitted as a path", async () => {
    const deleted: string[] = [];
    const savedUrl = `${CONFIG.url}/storage/v1/object/public/${CONFIG.bucket}/${USER_A}/saved.png`;
    const route = createAvatarCleanupRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      readConfig: () => CONFIG,
      deleteObject: async (_config, path) => {
        deleted.push(path);
      },
      service: {
        getOwnProfile: async () => ({ avatarUrl: savedUrl }),
      } as never,
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profile/avatar-cleanup`, {
        method: "POST",
        headers: authed("token-a"),
        body: JSON.stringify({ avatarUrl: `${USER_A}/saved.png` }),
      }),
    );
    expect(response.status).toBe(409);
    expect(deleted).toHaveLength(0);
  });

  it("rejects cross-member deletion attempts", async () => {
    const deleted: string[] = [];
    const route = createAvatarCleanupRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      readConfig: () => CONFIG,
      deleteObject: async (_config, path) => {
        deleted.push(path);
      },
      service: {
        getOwnProfile: async () => ({ avatarUrl: null }),
      } as never,
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profile/avatar-cleanup`, {
        method: "POST",
        headers: authed("token-a"),
        body: JSON.stringify({ avatarUrl: `${USER_B}/pending.png` }),
      }),
    );
    expect(response.status).toBe(403);
    expect(deleted).toHaveLength(0);
  });
});
