import { describe, expect, it } from "vitest";

import {
  TestSessionSource,
  bearerTokenOf,
  type Session,
} from "@/server/auth/session";

/**
 * Session-resolution boundary tests.
 * The `TestSessionSource` here is a labelled TEST DOUBLE: it does not verify
 * real credentials (no provider project exists yet — G-2). It exists to pin
 * how the boundary behaves, so nothing passes a browser-supplied ID off as a
 * verified session.
 */

const USERS = [
  {
    userId: "11111111-1111-4111-8111-111111111111",
    roles: ["member"] as Session["roles"],
  },
  { userId: "22222222-2222-4222-8222-222222222222" },
];

function requestWithAuthHeader(AuserID?: string): Request {
  const headers = new Headers();
  if (AuserID) {
    headers.set("authorization", `Bearer ${AuserID}`);
  }
  return new Request("http://localhost:3000/api/v1/owned-items", { headers });
}

describe("session verification boundary", () => {
  it("missing Authorization header resolves to no session (deny-by-default)", async () => {
    const source = new TestSessionSource(USERS);
    expect(await source.getSession(requestWithAuthHeader())).toBeNull();
  });

  it("malformed Authorization header resolves to no session", async () => {
    const source = new TestSessionSource(USERS);
    const request = new Request("http://localhost:3000/api/v1/owned-items", {
      headers: { authorization: "Basic somethingsomething" },
    });
    expect(await source.getSession(request)).toBeNull();
  });

  it("unknown token resolves to no session", async () => {
    const source = new TestSessionSource(USERS);
    expect(
      await source.getSession(
        requestWithAuthHeader("33333333-3333-4333-8333-333333333333"),
      ),
    ).toBeNull();
  });

  it("a known token resolves to the verified session for that user", async () => {
    const source = new TestSessionSource(USERS);
    const session = await source.getSession(
      requestWithAuthHeader(USERS[1]!.userId),
    );
    expect(session).not.toBeNull();
    expect(session!.userId).toBe(USERS[1]!.userId);
    expect(session!.roles).toEqual(["member"]);
  });

  it("bearerTokenOf reads only the Bearer scheme", () => {
    expect(bearerTokenOf(requestWithAuthHeader("tau"))).toBe("tau");
    expect(
      bearerTokenOf(
        new Request("http://x", { headers: { authorization: "Bearer  " } }),
      ),
    ).toBeNull();
  });
});
