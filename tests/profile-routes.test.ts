import { beforeEach, describe, expect, it } from "vitest";

import { createOnboardingRoute } from "@/app/api/v1/profile/onboarding/route";
import {
  createGetProfileRoute,
  createUpdateProfileRoute,
} from "@/app/api/v1/profile/route";
import { createUsernameAvailabilityRoute } from "@/app/api/v1/profile/username-availability/route";
import { createPublicProfileRoute } from "@/app/api/v1/profiles/[username]/route";
import { createProfileService } from "@/modules/profile/service";
import type { SessionSource } from "@/server/auth/session";
import { createInMemoryRateLimiter } from "@/server/ratelimit";

import {
  createInMemoryProfileRepository,
  makeProfile,
  type InMemoryProfileRepository,
} from "./helpers/profile-double";

/**
 * TASK-007 profile routes — HTTP contract.
 *
 * The session source and repository are labelled test doubles: these prove
 * status codes, CSRF/origin handling, tampering behaviour, private-profile 404s,
 * DTO shape and rate limiting. They do not prove live Supabase verification or
 * live Neon persistence.
 */

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb";
const ORIGIN = "http://localhost:3000";

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

function asToken(token: string | undefined, headers = new Headers()): Headers {
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return headers;
}

function jsonRequest(
  path: string,
  method: string,
  body: unknown,
  headers: Headers,
): Request {
  const withType = new Headers(headers);
  withType.set("content-type", "application/json");
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers: withType,
    body: JSON.stringify(body),
  });
}

let repository: InMemoryProfileRepository;
let service: ReturnType<typeof createProfileService>;
let sessions: Record<string, string>;

beforeEach(() => {
  repository = createInMemoryProfileRepository();
  service = createProfileService(repository);
  sessions = { "token-a": USER_A, "token-b": USER_B };
});

describe("GET /api/v1/profile", () => {
  it("denies anonymous callers", async () => {
    const route = createGetProfileRoute({
      sessionSource: nullSource,
      service,
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profile`, { headers: asToken(undefined) }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "unauthorized", message: "Sign in required." },
    });
  });

  it("returns null before onboarding and never the auth subject", async () => {
    const route = createGetProfileRoute({
      sessionSource: sessionSourceFor(sessions),
      service,
    });
    const before = await route(
      new Request(`${ORIGIN}/api/v1/profile`, {
        headers: asToken("token-a"),
      }),
    );
    expect(before.status).toBe(200);
    expect(await before.json()).toEqual({ profile: null });

    await service.completeOnboarding(
      { userId: USER_A, roles: ["member"] },
      { username: "ada_okoro", displayName: "Ada", visibility: "public" },
    );

    const after = await route(
      new Request(`${ORIGIN}/api/v1/profile`, {
        headers: asToken("token-a"),
      }),
    );
    const body = (await after.json()) as { profile: Record<string, unknown> };
    expect(body.profile["username"]).toBe("ada_okoro");
    expect(JSON.stringify(body)).not.toContain(USER_A);
  });
});

describe("POST /api/v1/profile/onboarding", () => {
  it("creates once and resumes on retry", async () => {
    const route = createOnboardingRoute({
      sessionSource: sessionSourceFor(sessions),
      service,
    });
    const send = () => {
      const headers = asToken("token-a");
      headers.set("origin", ORIGIN);
      return route(
        jsonRequest(
          "/api/v1/profile/onboarding",
          "POST",
          {
            username: "Ada_Okoro",
            displayName: "Ada Okoro",
          },
          headers,
        ),
      );
    };

    const first = await send();
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as {
      profile: { username: string };
      created: boolean;
    };
    expect(firstBody.created).toBe(true);
    expect(firstBody.profile.username).toBe("ada_okoro");

    const second = await send();
    expect(second.status).toBe(200);
    expect(((await second.json()) as { created: boolean }).created).toBe(false);
    expect(repository.rows.size).toBe(1);
  });

  it("requires a same-origin browser request (CSRF)", async () => {
    const route = createOnboardingRoute({
      sessionSource: sessionSourceFor(sessions),
      service,
    });
    const headers = asToken("token-a");
    headers.set("origin", "https://evil.example");
    const response = await route(
      jsonRequest(
        "/api/v1/profile/onboarding",
        "POST",
        {
          username: "ada_okoro",
          displayName: "Ada",
        },
        headers,
      ),
    );
    expect(response.status).toBe(403);
    expect(repository.rows.size).toBe(0);
  });

  it("rejects invalid input with field names only", async () => {
    const route = createOnboardingRoute({
      sessionSource: sessionSourceFor(sessions),
      service,
    });
    const headers = asToken("token-a");
    headers.set("origin", ORIGIN);
    const response = await route(
      jsonRequest(
        "/api/v1/profile/onboarding",
        "POST",
        {
          username: "ada_okoro",
        },
        headers,
      ),
    );
    expect(response.status).toBe(400);
    const body = JSON.stringify(await response.json());
    expect(body).toContain("displayName");
    expect(body).not.toContain("ada_okoro");
  });

  it("answers 409 when the handle is taken", async () => {
    repository.rows.set(
      USER_B,
      makeProfile({ identityId: USER_B, username: "ada_okoro" }),
    );
    const route = createOnboardingRoute({
      sessionSource: sessionSourceFor(sessions),
      service,
    });
    const headers = asToken("token-a");
    headers.set("origin", ORIGIN);
    const response = await route(
      jsonRequest(
        "/api/v1/profile/onboarding",
        "POST",
        {
          username: "ada_okoro",
          displayName: "Ada",
        },
        headers,
      ),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "conflict",
        message: "That username is not available.",
      },
    });
  });
});

describe("PATCH /api/v1/profile", () => {
  beforeEach(async () => {
    await service.completeOnboarding(
      { userId: USER_A, roles: ["member"] },
      { username: "ada_okoro", displayName: "Ada", visibility: "public" },
    );
    await service.completeOnboarding(
      { userId: USER_B, roles: ["member"] },
      { username: "bola_okoro", displayName: "Bola", visibility: "public" },
    );
  });

  it("updates the caller's own profile", async () => {
    const route = createUpdateProfileRoute({
      sessionSource: sessionSourceFor(sessions),
      service,
    });
    const headers = asToken("token-a");
    headers.set("origin", ORIGIN);
    const response = await route(
      jsonRequest(
        "/api/v1/profile",
        "PATCH",
        {
          displayName: "Ada Updated",
          visibility: "private",
        },
        headers,
      ),
    );

    expect(response.status).toBe(200);
    expect(repository.rows.get(USER_A)?.displayName).toBe("Ada Updated");
    expect(repository.rows.get(USER_B)?.displayName).toBe("Bola");
  });

  it("rejects a body that tries to name another identity (mass assignment)", async () => {
    const route = createUpdateProfileRoute({
      sessionSource: sessionSourceFor(sessions),
      service,
    });
    const headers = asToken("token-a");
    headers.set("origin", ORIGIN);
    const response = await route(
      jsonRequest(
        "/api/v1/profile",
        "PATCH",
        {
          displayName: "Hijacked",
          identityId: USER_B,
        },
        headers,
      ),
    );

    expect(response.status).toBe(400);
    expect(repository.rows.get(USER_A)?.displayName).toBe("Ada");
    expect(repository.rows.get(USER_B)?.displayName).toBe("Bola");
  });

  it("requires a same-origin request", async () => {
    const route = createUpdateProfileRoute({
      sessionSource: sessionSourceFor(sessions),
      service,
    });
    const headers = asToken("token-a");
    headers.set("origin", "https://evil.example");
    const response = await route(
      jsonRequest("/api/v1/profile", "PATCH", { displayName: "X" }, headers),
    );
    expect(response.status).toBe(403);
  });

  it("rate-limits mutations", async () => {
    const route = createUpdateProfileRoute({
      sessionSource: sessionSourceFor(sessions),
      service,
      limiter: createInMemoryRateLimiter({
        maxPerWindow: 1,
        windowSeconds: 60,
      }),
    });
    const headers = asToken("token-a");
    headers.set("origin", ORIGIN);

    const first = await route(
      jsonRequest("/api/v1/profile", "PATCH", { displayName: "One" }, headers),
    );
    expect(first.status).toBe(200);

    const second = await route(
      jsonRequest("/api/v1/profile", "PATCH", { displayName: "Two" }, headers),
    );
    expect(second.status).toBe(429);
    expect(repository.rows.get(USER_A)?.displayName).toBe("One");
  });
});

describe("GET /api/v1/profiles/[username]", () => {
  beforeEach(async () => {
    await service.completeOnboarding(
      { userId: USER_A, roles: ["member"] },
      {
        username: "ada_okoro",
        displayName: "Ada",
        bio: "Tailor",
        visibility: "private",
      },
    );
  });

  it("answers 404 for a private profile to strangers and anonymous visitors", async () => {
    for (const source of [nullSource, sessionSourceFor(sessions)]) {
      const route = createPublicProfileRoute({
        sessionSource: source,
        service,
      });
      const token = source === nullSource ? undefined : "token-b";
      const response = await route(
        new Request(`${ORIGIN}/api/v1/profiles/ada_okoro`, {
          headers: asToken(token),
        }),
      );
      expect(response.status).toBe(404);
    }
  });

  it("lets the owner read their own private profile", async () => {
    const route = createPublicProfileRoute({
      sessionSource: sessionSourceFor(sessions),
      service,
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profiles/Ada_Okoro`, {
        headers: asToken("token-a"),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      profile: Record<string, unknown>;
      isOwner: boolean;
    };
    expect(body.isOwner).toBe(true);
    expect(body.profile["visibility"]).toBe("private");
  });

  it("exposes only public fields to other viewers", async () => {
    await service.updateOwnProfile(
      { userId: USER_A, roles: ["member"] },
      { visibility: "public" },
    );
    const route = createPublicProfileRoute({
      sessionSource: nullSource,
      service,
    });
    const response = await route(
      new Request(`${ORIGIN}/api/v1/profiles/ada_okoro`),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      profile: Record<string, unknown>;
      isOwner: boolean;
    };
    expect(body.isOwner).toBe(false);
    expect(Object.keys(body.profile).sort()).toEqual([
      "avatarUrl",
      "bio",
      "displayName",
      "username",
    ]);
    expect(JSON.stringify(body)).not.toContain(USER_A);
  });
});

describe("GET /api/v1/profile/username-availability", () => {
  it("normalises the probe and reports availability", async () => {
    const route = createUsernameAvailabilityRoute({
      sessionSource: nullSource,
      service,
    });
    const response = await route(
      new Request(
        `${ORIGIN}/api/v1/profile/username-availability?username=Ada_OKoro`,
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      username: "ada_okoro",
      available: true,
    });
  });

  it("rejects a malformed probe", async () => {
    const route = createUsernameAvailabilityRoute({
      sessionSource: nullSource,
      service,
    });
    const response = await route(
      new Request(
        `${ORIGIN}/api/v1/profile/username-availability?username=not%20a%20handle`,
      ),
    );
    expect(response.status).toBe(400);
  });
});
