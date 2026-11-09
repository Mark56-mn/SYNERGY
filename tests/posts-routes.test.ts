import { beforeEach, describe, expect, it } from "vitest";

import { createFeedRoute } from "@/app/api/v1/feed/route";
import { createCreatePostRoute } from "@/app/api/v1/posts/route";
import { createDeletePostRoute } from "@/app/api/v1/posts/[id]/route";
import { createPostLikeRoute } from "@/app/api/v1/posts/[id]/like/route";
import { createPostsService } from "@/modules/posts/service";
import type { SessionSource } from "@/server/auth/session";
import { createInMemoryRateLimiter } from "@/server/ratelimit";

import {
  createInMemoryPostRepository,
  makeAuthor,
  type InMemoryPostRepository,
} from "./helpers/posts-double";

/**
 * TASK-008A HTTP surfaces: auth, CSRF, validation, visibility and rate limits.
 * The repository is an in-memory double; live Neon behaviour is in
 * `scripts/posts-live-check.mjs`.
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
  service = createPostsService(repository);
});

function jsonRequest(
  path: string,
  options: {
    method?: string;
    token?: string;
    origin?: string;
    body?: unknown;
  } = {},
): Request {
  const headers = new Headers();
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  headers.set("origin", options.origin ?? ORIGIN);
  if (options.body !== undefined)
    headers.set("content-type", "application/json");
  return new Request(`${ORIGIN}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

const feed = () => createFeedRoute({ sessionSource, service });
const createPost = () =>
  createCreatePostRoute({
    sessionSource,
    service,
    limiter: createInMemoryRateLimiter({ maxPerWindow: 2, windowSeconds: 60 }),
  });
const deletePost = () => createDeletePostRoute({ sessionSource, service });
const likePost = () => createPostLikeRoute({ sessionSource, service }, true);

describe("GET /api/v1/feed", () => {
  it("serves an anonymous feed with no-store caching", async () => {
    await service.createPost(
      { userId: USER_A, roles: ["member"] },
      { body: "Hi" },
    );
    const response = await feed()(jsonRequest("/api/v1/feed"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as { posts: Array<{ body: string }> };
    expect(body.posts.map((post) => post.body)).toEqual(["Hi"]);
  });

  it("rejects a tampered cursor instead of ignoring it", async () => {
    const response = await feed()(
      jsonRequest("/api/v1/feed?cursor=bm90LWEtY3Vyc29y"),
    );
    expect(response.status).toBe(400);
  });
});

describe("POST /api/v1/posts", () => {
  it("denies anonymous callers before writing", async () => {
    const response = await createPost()(
      jsonRequest("/api/v1/posts", { method: "POST", body: { body: "Hi" } }),
    );
    expect(response.status).toBe(401);
    expect(repository.rows).toHaveLength(0);
  });

  it("requires a same-origin request (CSRF)", async () => {
    const response = await createPost()(
      jsonRequest("/api/v1/posts", {
        method: "POST",
        token: "token-a",
        origin: "https://evil.example",
        body: { body: "Hi" },
      }),
    );
    expect(response.status).toBe(403);
    expect(repository.rows).toHaveLength(0);
  });

  it("publishes for the verified caller and returns the DTO", async () => {
    const response = await createPost()(
      jsonRequest("/api/v1/posts", {
        method: "POST",
        token: "token-a",
        body: { body: "Hello #makers" },
      }),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      post: { id: string; topics: string[]; author: { username: string } };
    };
    expect(body.post.topics).toEqual(["makers"]);
    expect(body.post.author.username).toBe("ada_okoro");
    expect(JSON.stringify(body)).not.toContain(USER_A);
    expect(repository.rows).toHaveLength(1);
  });

  it("rejects a body that names an author", async () => {
    const response = await createPost()(
      jsonRequest("/api/v1/posts", {
        method: "POST",
        token: "token-a",
        body: { body: "Hi", identityId: USER_B },
      }),
    );
    expect(response.status).toBe(400);
    expect(repository.rows).toHaveLength(0);
  });

  it("rate-limits publishing", async () => {
    const route = createPost();
    const make = () =>
      jsonRequest("/api/v1/posts", {
        method: "POST",
        token: "token-a",
        body: { body: "Hi" },
      });
    expect((await route(make())).status).toBe(201);
    expect((await route(make())).status).toBe(201);
    expect((await route(make())).status).toBe(429);
  });
});

describe("DELETE /api/v1/posts/[id]", () => {
  it("deletes the owner's post and hides it from the feed", async () => {
    const post = await service.createPost(
      { userId: USER_A, roles: ["member"] },
      { body: "Mine" },
    );
    const response = await deletePost()(
      jsonRequest(`/api/v1/posts/${post.id}`, {
        method: "DELETE",
        token: "token-a",
      }),
      { params: Promise.resolve({ id: post.id }) },
    );
    expect(response.status).toBe(200);
    const feedResponse = await feed()(jsonRequest("/api/v1/feed"));
    const body = (await feedResponse.json()) as { posts: unknown[] };
    expect(body.posts).toHaveLength(0);
  });

  it("answers 404 for another member's post and leaves it intact", async () => {
    const post = await service.createPost(
      { userId: USER_A, roles: ["member"] },
      { body: "Mine" },
    );
    const response = await deletePost()(
      jsonRequest(`/api/v1/posts/${post.id}`, {
        method: "DELETE",
        token: "token-b",
      }),
      { params: Promise.resolve({ id: post.id }) },
    );
    expect(response.status).toBe(404);
    expect(repository.rows).toHaveLength(1);
  });
});

describe("POST /api/v1/posts/[id]/like", () => {
  it("requires a session", async () => {
    const post = await service.createPost(
      { userId: USER_A, roles: ["member"] },
      { body: "Like me" },
    );
    const response = await likePost()(
      jsonRequest(`/api/v1/posts/${post.id}/like`, { method: "POST" }),
      { params: Promise.resolve({ id: post.id }) },
    );
    expect(response.status).toBe(401);
  });

  it("persists one like per member", async () => {
    const post = await service.createPost(
      { userId: USER_A, roles: ["member"] },
      { body: "Like me" },
    );
    const response = await likePost()(
      jsonRequest(`/api/v1/posts/${post.id}/like`, {
        method: "POST",
        token: "token-b",
      }),
      { params: Promise.resolve({ id: post.id }) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ likeCount: 1, liked: true });
  });

  it("answers 404 for a post the caller cannot see", async () => {
    const response = await likePost()(
      jsonRequest(`/api/v1/posts/11111111-1111-4111-8111-111111111111/like`, {
        method: "POST",
        token: "token-b",
      }),
      {
        params: Promise.resolve({
          id: "11111111-1111-4111-8111-111111111111",
        }),
      },
    );
    expect(response.status).toBe(404);
  });
});
