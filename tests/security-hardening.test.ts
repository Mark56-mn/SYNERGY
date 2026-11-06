import { describe, expect, it, vi } from "vitest";

import {
  createGetRoute,
  createPostRoute,
} from "@/app/api/v1/owned-items/route";
import {
  createOwnedResourceService,
  InMemoryOwnedItemRepository,
} from "@/modules/example-owned-resource/service";
import { TestSessionSource } from "@/server/auth/session";
import { requireRole } from "@/server/authz";
import { AppError } from "@/server/http/errors";
import { createApiRoute } from "@/server/http/handler";
import { createInMemoryRateLimiter } from "@/server/ratelimit";

/**
 * TASK-005 hardening cases for the server boundary. These extend (and never
 * replace) `tests/auth-boundaries.test.ts`. The session source is the same
 * labelled TEST DOUBLE: this proves boundary behaviour, not production
 * authentication, which still requires G-2 provisioning.
 */

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const SOURCE = new TestSessionSource([
  { userId: USER_A, roles: ["member"] },
  { userId: USER_B, roles: ["member"] },
]);

function request(
  userId: string | null,
  init: { method?: string; body?: unknown; url?: string } = {},
): Request {
  const headers = new Headers();
  if (userId) {
    headers.set("authorization", `Bearer ${userId}`);
  }
  if (init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  return new Request(init.url ?? "http://localhost:3000/api/v1/owned-items", {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

describe("rate limiting through the route wrapper", () => {
  it("denies with 429 once the window is exhausted and never runs the handler", async () => {
    const handler = vi.fn(() => Response.json({ ok: true }));
    const route = createApiRoute({
      sessionSource: SOURCE,
      limiter: createInMemoryRateLimiter({
        maxPerWindow: 1,
        windowSeconds: 60,
        now: () => 0,
      }),
      handler,
    });

    expect((await route(request(USER_A))).status).toBe(200);
    const denied = await route(request(USER_A));
    expect(denied.status).toBe(429);
    expect((await denied.json()).error.code).toBe("rate_limited");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("isolates limits per verified identity through the route", async () => {
    const route = createApiRoute({
      sessionSource: SOURCE,
      limiter: createInMemoryRateLimiter({
        maxPerWindow: 1,
        windowSeconds: 60,
        now: () => 0,
      }),
      handler: () => Response.json({ ok: true }),
    });

    expect((await route(request(USER_A))).status).toBe(200);
    expect((await route(request(USER_A))).status).toBe(429);
    // USER_B has its own bucket and is unaffected by A's exhaustion.
    expect((await route(request(USER_B))).status).toBe(200);
  });

  it("rejects invalid input without persisting anything", async () => {
    const route = createPostRoute({ sessionSource: SOURCE });
    const rejected = await route(
      request(USER_A, { method: "POST", body: { title: "" } }),
    );
    expect(rejected.status).toBe(400);

    const listRoute = createGetRoute({ sessionSource: SOURCE });
    const body = (await (await listRoute(request(USER_A))).json()) as {
      items: Array<{ title: string }>;
    };
    expect(body.items.some((item) => item.title === "")).toBe(false);
  });
});

describe("mass assignment and attribution", () => {
  it("extra body fields never set ownership or grant roles", async () => {
    const repository = new InMemoryOwnedItemRepository();
    const service = createOwnedResourceService(repository);
    const route = createPostRoute({ sessionSource: SOURCE });

    const response = await route(
      request(USER_A, {
        method: "POST",
        body: {
          title: "Legitimate title",
          ownerId: USER_B,
          owner_id: USER_B,
          roles: ["moderator"],
          isAdmin: true,
        },
      }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      item: { ownerId: string; title: string };
    };
    expect(body.item.ownerId).toBe(USER_A);
    expect(body.item.title).toBe("Legitimate title");
    // The verified session still holds only its original role.
    const session = await SOURCE.getSession(request(USER_A));
    expect(session?.roles).toEqual(["member"]);
    // The service is untouched by the extra fields either.
    expect(
      service.listOwnItems(session).every((item) => item.ownerId === USER_A),
    ).toBe(true);
    expect(repository.listByOwner(USER_B)).toHaveLength(0);
  });

  it("a forged query-string user id cannot change whose list is returned", async () => {
    const route = createGetRoute({ sessionSource: SOURCE });
    const createRoute = createPostRoute({ sessionSource: SOURCE });

    const created = await createRoute(
      request(USER_A, { method: "POST", body: { title: "A only" } }),
    );
    expect(created.status).toBe(201);

    const response = await route(
      request(USER_A, {
        url: `http://localhost:3000/api/v1/owned-items?user_id=${USER_B}`,
      }),
    );
    const body = (await response.json()) as {
      items: Array<{ ownerId: string; title: string }>;
    };
    expect(body.items.every((item) => item.ownerId === USER_A)).toBe(true);
    expect(body.items.some((item) => item.title === "A only")).toBe(true);
  });
});

describe("role checks deny by default", () => {
  it("an absent session is unauthorised, not forbidden", () => {
    try {
      requireRole(null, ["moderator"]);
      expect.unreachable("expected an AppError");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("unauthorized");
    }
  });

  it("a member session cannot satisfy a moderator requirement", async () => {
    const session = await SOURCE.getSession(request(USER_A));
    try {
      requireRole(session, ["moderator"]);
      expect.unreachable("expected an AppError");
    } catch (error) {
      expect((error as AppError).code).toBe("forbidden");
    }
  });
});

describe("error responses stay safe", () => {
  it("a 401 body never echoes the presented token or another user id", async () => {
    const route = createGetRoute({ sessionSource: SOURCE });
    const response = await route(request("not-a-real-token"));
    expect(response.status).toBe(401);
    const text = JSON.stringify(await response.json());
    expect(text).not.toContain("not-a-real-token");
    expect(text).not.toContain(USER_A);
    expect(text).not.toContain(USER_B);
  });

  it("JSON null is a 400 rather than a crash", async () => {
    const route = createPostRoute({ sessionSource: SOURCE });
    const response = await route(
      request(USER_A, { method: "POST", body: null }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("bad_request");
  });
});
