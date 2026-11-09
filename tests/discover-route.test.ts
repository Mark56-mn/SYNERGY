import { beforeEach, describe, expect, it } from "vitest";

import { createDiscoverRoute } from "@/app/api/v1/discover/route";
import { createPostsService } from "@/modules/posts/service";
import type { SessionSource } from "@/server/auth/session";
import { createInMemoryRateLimiter } from "@/server/ratelimit";

import {
  createInMemoryPostRepository,
  makeAuthor,
  makePost,
  type InMemoryPostRepository,
} from "./helpers/posts-double";

/**
 * TASK-008C discovery HTTP surface: search, topic filter, creator suggestions
 * and the same visibility rule as the feed. Repository is an in-memory double;
 * live Neon behaviour is proved by `scripts/posts-live-check.mjs`.
 */

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb";
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

let repository: InMemoryPostRepository;
let service: ReturnType<typeof createPostsService>;

beforeEach(() => {
  repository = createInMemoryPostRepository({
    authors: [
      { identityId: USER_A, author: makeAuthor({ username: "ada_okoro" }) },
      { identityId: USER_B, author: makeAuthor({ username: "bola_okoro" }) },
    ],
  });
  repository.rows.push(
    makePost({
      identityId: USER_A,
      author: makeAuthor({ username: "ada_okoro", displayName: "Ada Okoro" }),
      body: "Tailoring three shirts this week. #tailoring",
      topics: ["tailoring"],
      createdAt: new Date(),
    }),
    makePost({
      identityId: USER_B,
      author: makeAuthor({
        username: "bola_okoro",
        displayName: "Bola Okoro",
        visibility: "private",
      }),
      body: "Private tailoring notes. #tailoring",
      topics: ["tailoring"],
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    }),
  );
  // A private author is not a public creator, however many posts they have.
  repository.authors.set(
    USER_B,
    makeAuthor({
      username: "bola_okoro",
      displayName: "Bola Okoro",
      visibility: "private",
    }),
  );
  service = createPostsService(repository);
});

function request(path: string, options: { token?: string } = {}): Request {
  const headers = new Headers();
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  return new Request(`${ORIGIN}${path}`, { headers });
}

const route = (limiter = createInMemoryRateLimiter({ maxPerWindow: 60 })) =>
  createDiscoverRoute({ sessionSource, service, limiter });

describe("GET /api/v1/discover", () => {
  it("searches public posts for anonymous visitors and never caches", async () => {
    const response = await route()(request("/api/v1/discover?q=tailoring"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body = (await response.json()) as {
      query: string;
      posts: Array<{ body: string; author: { username: string } }>;
      creators: Array<{ username: string }>;
      topics: Array<{ topic: string }>;
    };
    expect(body.query).toBe("tailoring");
    expect(body.posts.map((post) => post.author.username)).toEqual([
      "ada_okoro",
    ]);
    expect(body.posts[0]?.body).toContain("Tailoring three shirts");
    expect(body.creators.map((creator) => creator.username)).not.toContain(
      "bola_okoro",
    );
    expect(body.topics.map((topic) => topic.topic)).toContain("tailoring");
    expect(JSON.stringify(body)).not.toContain(USER_A);
    expect(JSON.stringify(body)).not.toContain("identityId");
  });

  it("shows a private author their own matching post, and only to them", async () => {
    const anonymous = await route()(request("/api/v1/discover?q=Private"));
    const anonBody = (await anonymous.json()) as { posts: unknown[] };
    expect(anonBody.posts).toHaveLength(0);

    const owner = await route()(
      request("/api/v1/discover?q=Private", { token: "token-b" }),
    );
    const ownerBody = (await owner.json()) as {
      posts: Array<{ body: string; isOwner: boolean }>;
    };
    expect(ownerBody.posts).toHaveLength(1);
    expect(ownerBody.posts[0]?.isOwner).toBe(true);
  });

  it("filters by topic and combines it with a search term", async () => {
    repository.rows.push(
      makePost({
        identityId: USER_A,
        author: makeAuthor({ username: "ada_okoro" }),
        body: "A public note about dyeing",
        topics: ["dyeing"],
      }),
    );

    const filtered = await route()(request("/api/v1/discover?topic=tailoring"));
    const filteredBody = (await filtered.json()) as {
      topic: string;
      posts: Array<{ body: string }>;
    };
    expect(filteredBody.topic).toBe("tailoring");
    expect(filteredBody.posts).toHaveLength(1);

    const combined = await route()(
      request("/api/v1/discover?q=shirts&topic=tailoring"),
    );
    const combinedBody = (await combined.json()) as {
      posts: Array<{ body: string }>;
    };
    expect(combinedBody.posts).toHaveLength(1);

    const mismatch = await route()(
      request("/api/v1/discover?q=shirts&topic=dyeing"),
    );
    expect(
      ((await mismatch.json()) as { posts: unknown[] }).posts,
    ).toHaveLength(0);
  });

  it("rejects an invalid topic filter instead of ignoring it", async () => {
    const response = await route()(
      request("/api/v1/discover?topic=not%20a%20topic"),
    );
    expect(response.status).toBe(400);
  });

  it("suggests only public creators, filtered by a creator search", async () => {
    const all = await route()(request("/api/v1/discover"));
    const allBody = (await all.json()) as {
      creators: Array<{ username: string; postCount: number }>;
    };
    expect(allBody.creators.map((creator) => creator.username)).toEqual([
      "ada_okoro",
    ]);

    const none = await route()(request("/api/v1/discover?q=bola"));
    expect(((await none.json()) as { creators: unknown[] }).creators).toEqual(
      [],
    );
  });

  it("rate-limits discovery reads per caller", async () => {
    const limited = route(
      createInMemoryRateLimiter({ maxPerWindow: 1, windowSeconds: 60 }),
    );
    expect((await limited(request("/api/v1/discover"))).status).toBe(200);
    expect((await limited(request("/api/v1/discover"))).status).toBe(429);
  });
});
