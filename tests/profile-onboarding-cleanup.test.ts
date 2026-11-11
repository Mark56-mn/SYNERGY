import { describe, expect, it } from "vitest";

import { createOnboardingRoute } from "@/app/api/v1/profile/onboarding/route";
import type { SessionSource } from "@/server/auth/session";
import { createInMemoryRateLimiter } from "@/server/ratelimit";
import { makeProfile } from "./helpers/profile-double";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
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

function authed(token?: string): Headers {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  headers.set("origin", ORIGIN);
  headers.set("content-type", "application/json");
  return headers;
}

describe("POST /api/v1/profile/onboarding cleanup", () => {
  it("cleans up a newly uploaded avatar when onboarding fails", async () => {
    const deleted: string[] = [];
    const service = {
      completeOnboarding: async () => {
        throw new Error("database down");
      },
    };
    const route = createOnboardingRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      service: service as never,
      readConfig: () => CONFIG,
      deleteObject: async (_config, path) => {
        deleted.push(path);
      },
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profile/onboarding`, {
        method: "POST",
        headers: authed("token-a"),
        body: JSON.stringify({
          username: "ada_okoro",
          displayName: "Ada",
          avatarUrl: `${CONFIG.url}/storage/v1/object/public/${CONFIG.bucket}/${USER_A}/pending.png`,
        }),
      }),
    );
    expect(response.status).toBe(500);
    expect(deleted).toEqual([`${USER_A}/pending.png`]);
  });

  it("preserves a newly uploaded avatar when onboarding succeeds", async () => {
    const deleted: string[] = [];
    const service = {
      completeOnboarding: async () => ({
        profile: makeProfile({
          identityId: USER_A,
          username: "ada_okoro",
          avatarUrl: `${CONFIG.url}/storage/v1/object/public/${CONFIG.bucket}/${USER_A}/pending.png`,
        }),
        created: true,
      }),
    };
    const route = createOnboardingRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      service: service as never,
      readConfig: () => CONFIG,
      deleteObject: async (_config, path) => {
        deleted.push(path);
      },
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profile/onboarding`, {
        method: "POST",
        headers: authed("token-a"),
        body: JSON.stringify({
          username: "ada_okoro",
          displayName: "Ada",
          avatarUrl: `${CONFIG.url}/storage/v1/object/public/${CONFIG.bucket}/${USER_A}/pending.png`,
        }),
      }),
    );
    expect(response.status).toBe(201);
    expect(deleted).toHaveLength(0);
  });

  it("does not delete cross-member pending avatars", async () => {
    const deleted: string[] = [];
    const service = {
      completeOnboarding: async () => {
        throw new Error("database down");
      },
    };
    const route = createOnboardingRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      service: service as never,
      readConfig: () => CONFIG,
      deleteObject: async (_config, path) => {
        deleted.push(path);
      },
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profile/onboarding`, {
        method: "POST",
        headers: authed("token-a"),
        body: JSON.stringify({
          username: "ada_okoro",
          displayName: "Ada",
          avatarUrl: `${CONFIG.url}/storage/v1/object/public/${CONFIG.bucket}/bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb/pending.png`,
        }),
      }),
    );
    expect(response.status).toBe(500);
    expect(deleted).toHaveLength(0);
  });

  it("preserves the original error when cleanup fails", async () => {
    const service = {
      completeOnboarding: async () => {
        throw new Error("original failure");
      },
    };
    const route = createOnboardingRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      service: service as never,
      readConfig: () => CONFIG,
      deleteObject: async () => {
        throw new Error("cleanup failure");
      },
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profile/onboarding`, {
        method: "POST",
        headers: authed("token-a"),
        body: JSON.stringify({
          username: "ada_okoro",
          displayName: "Ada",
          avatarUrl: `${CONFIG.url}/storage/v1/object/public/${CONFIG.bucket}/${USER_A}/pending.png`,
        }),
      }),
    );
    expect(response.status).toBe(500);
  });
});
