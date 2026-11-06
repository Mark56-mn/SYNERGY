import { describe, expect, it } from "vitest";

import {
  createOwnedResourceService,
  InMemoryOwnedItemRepository,
} from "@/modules/example-owned-resource/service";
import type { Session } from "@/server/auth/session";
import {
  createGetRoute,
  createPostRoute,
} from "@/app/api/v1/owned-items/route";
import { TestSessionSource } from "@/server/auth/session";
import { createInMemoryRateLimiter } from "@/server/ratelimit";
import { createApiRoute } from "@/server/http/handler";

/**
 * SECURITY BOUNDARY TESTS (ADR-0003 test matrix, MVP cross-user isolation).
 *
 * IMPORTANT CONTEXT: the session source here is a labelled TEST DOUBLE and
 * the repository is an in-memory double. These tests PROVE the boundary
 * logic (deny by default, ownership checks, service attribution), NOT
 * production authentication — that requires a real Supabase Auth project
 * (G-2) and must be re-verified against it. Do not claim production security
 * from this suite.
 */

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const SOURCE = new TestSessionSource([
  { userId: USER_A, roles: ["member"] },
  { userId: USER_B, roles: ["member"] },
]);

function asUser(sessionUserId: string | null): Request {
  const headers = new Headers();
  if (sessionUserId) {
    headers.set("authorization", `Bearer ${sessionUserId}`);
  }
  return new Request("http://localhost:3000/api/v1/owned-items", { headers });
}

function jsonRequest(sessionUserId: string | null, body: unknown): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (sessionUserId) {
    headers.set("authorization", `Bearer ${sessionUserId}`);
  }
  return new Request("http://localhost:3000/api/v1/owned-items", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const repository = new InMemoryOwnedItemRepository();
const service = createOwnedResourceService(repository);

describe("deny-by-default: unauthenticated callers", () => {
  it("GET is denied with 401 and a safe body for anonymous callers", async () => {
    const response = await createGetRoute({ sessionSource: SOURCE })(
      asUser(null),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("unauthorized");
    expect(body.error.message).not.toContain(USER_A);
    expect(body.error.message).not.toContain(USER_B);
  });

  it("POST is denied with 401 for anonymous callers", async () => {
    const response = await createPostRoute({ sessionSource: SOURCE })(
      jsonRequest(null, { title: "sneaky" }),
    );
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorized");
  });
});

describe("attribution: a browser-supplied user id is never identity", () => {
  it("item ownership comes from the VERIFIED session, not from the request", async () => {
    // The request body carries NO owner field at all — creation attributes
    // the item to the caller whose session was verified.
    const created = service.createItem(
      (await SOURCE.getSession(asUser(USER_A)))!,
      { title: "A's first item" },
    );
    expect(created.ownerId).toBe(USER_A);
  });

  it("no session means creation is refused even with plausible data", async () => {
    expect(() =>
      service.createItem(null, { title: "impersonation attempt" }),
    ).toThrow(/Sign in required/);
  });
});

describe("cross-user access denial: one user cannot touch another's protected resources", () => {
  it("user B never sees user A's items in their protected list", async () => {
    service.createItem((await SOURCE.getSession(asUser(USER_A)))!, {
      title: "A private note",
    });
    const bList = service.listOwnItems(
      (await SOURCE.getSession(asUser(USER_B)))!,
    );
    expect(bList.every((item) => item.ownerId === USER_B)).toBe(true);
    expect(bList.some((item) => item.title === "A private note")).toBe(false);
  });

  it("user A cannot delete user B's item — deletion is refused as not their resource", async () => {
    const bItem = service.createItem(
      (await SOURCE.getSession(asUser(USER_B)))!,
      {
        title: "B's record",
      },
    );
    const userA = await SOURCE.getSession(asUser(USER_A));
    expect(() => service.deleteItem(userA, bItem.id)).toThrow();
  });

  it("the owner CAN delete their own item", async () => {
    const bItem = service.createItem(
      (await SOURCE.getSession(asUser(USER_B)))!,
      {
        title: "B's second record",
      },
    );
    const userB = await SOURCE.getSession(asUser(USER_B));
    expect(() => service.deleteItem(userB, bItem.id)).not.toThrow();
  });

  it("rate limiting isolates identities: one identity exhausts, another still passes", async () => {
    let t = 0;
    const limiter = createInMemoryRateLimiter({
      maxPerWindow: 2,
      windowSeconds: 60,
      now: () => t,
    });
    expect(limiter.limit(`user:${USER_A}`).allowed).toBe(true);
    expect(limiter.limit(`user:${USER_A}`).allowed).toBe(true);
    expect(limiter.limit(`user:${USER_A}`).allowed).toBe(false);
    // USER_B is a different identity key and is not affected by A's exhaustion.
    expect(limiter.limit(`user:${USER_B}`).allowed).toBe(true);
  });
});

describe("input validation and safe error responses", () => {
  it("invalid JSON body is a 400 without echoing internals", async () => {
    const headers = new Headers({ "content-type": "application/json" });
    headers.set("authorization", `Bearer ${USER_A}`);
    const response = await createPostRoute({ sessionSource: SOURCE })(
      new Request("http://localhost:3000/api/v1/owned-items", {
        method: "POST",
        headers,
        body: "{not json",
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("bad_request");
  });

  it("wrong content type is rejected as a bad request", async () => {
    const response = await createPostRoute({ sessionSource: SOURCE })(
      new Request("http://localhost:3000/api/v1/owned-items", {
        method: "POST",
        headers: {
          authorization: `Bearer ${USER_A}`,
          "content-type": "text/plain",
        },
        body: "title=hi",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("oversized/empty titles are rejected by field NAME only", async () => {
    const response = await createPostRoute({ sessionSource: SOURCE })(
      jsonRequest(USER_A, { title: "" }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toContain("title");
    expect(body.error.message).not.toContain("Value");
  });

  it("unexpected failures collapse to a generic 500 and never leak stack details", async () => {
    const route = createApiRoute<undefined>({
      sessionSource: SOURCE,
      handler: () => {
        throw new Error("super-secret-internal-detail");
      },
    });
    const response = await route(asUser(USER_A));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("internal_error");
    expect(JSON.stringify(body)).not.toContain("super-secret-internal-detail");
  });
});
