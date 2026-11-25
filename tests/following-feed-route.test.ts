import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it } from "vitest";

import { createFeedRoute } from "@/app/api/v1/feed/route";
import { createDrizzlePostRepository } from "@/modules/posts/repository";
import { createPostsService } from "@/modules/posts/service";
import type { SessionSource } from "@/server/auth/session";
import type { Database } from "@/server/db/client";

import {
  createInMemoryPostRepository,
  makeAuthor,
  type InMemoryPostRepository,
} from "./helpers/posts-double";

/**
 * TASK-008D Following feed: scope validation, auth/profile gates, visibility
 * exclusion from stale/private follows, cursor pagination and `no-store`.
 */

const USER_VIEWER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_FOLLOWED = "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb";
const USER_UNRELATED = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const USER_PRIVATE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const USER_NO_PROFILE = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const ORIGIN = "http://localhost:3000";

const sessionSource: SessionSource = {
  async getSession(request) {
    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    const map: Record<string, string> = {
      "token-viewer": USER_VIEWER,
      "token-no-profile": USER_NO_PROFILE,
    };
    const userId = token ? map[token] : null;
    return userId ? { userId, roles: ["member"] } : null;
  },
};

let repository: InMemoryPostRepository;
let service: ReturnType<typeof createPostsService>;

beforeEach(async () => {
  repository = createInMemoryPostRepository({
    authors: [
      {
        identityId: USER_VIEWER,
        author: makeAuthor({ username: "ada_okoro" }),
      },
      {
        identityId: USER_FOLLOWED,
        author: makeAuthor({ username: "bola_okoro" }),
      },
      {
        identityId: USER_UNRELATED,
        author: makeAuthor({ username: "chi_okoro" }),
      },
      {
        identityId: USER_PRIVATE,
        author: makeAuthor({ username: "dee_okoro", visibility: "private" }),
      },
    ],
    following: [
      { followerId: USER_VIEWER, followingId: USER_FOLLOWED },
      // A stale edge to a creator who is now private: it must grant nothing.
      { followerId: USER_VIEWER, followingId: USER_PRIVATE },
    ],
  });
  service = createPostsService(repository);

  await repository.create({
    identityId: USER_VIEWER,
    body: "The viewer's own post",
    mediaUrl: null,
    mediaAlt: null,
    topics: [],
  });
  await repository.create({
    identityId: USER_FOLLOWED,
    body: "A followed creator's post",
    mediaUrl: null,
    mediaAlt: null,
    topics: [],
  });
  await repository.create({
    identityId: USER_UNRELATED,
    body: "An unrelated creator's post",
    mediaUrl: null,
    mediaAlt: null,
    topics: [],
  });
  await repository.create({
    identityId: USER_PRIVATE,
    body: "A private creator's post",
    mediaUrl: null,
    mediaAlt: null,
    topics: [],
  });
});

function request(path: string, token?: string): Request {
  const headers = new Headers({ origin: ORIGIN });
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request(`${ORIGIN}${path}`, { headers });
}

const feed = () => createFeedRoute({ sessionSource, service });

function bodies(json: unknown): string[] {
  return (json as { posts: Array<{ body: string }> }).posts.map(
    (post) => post.body,
  );
}

/**
 * Compile the REAL query builder's WHERE clause to SQL without a connection.
 *
 * The in-memory double can only model the deletion rule; it cannot see the SQL
 * text. This captures the predicate that `listFollowingFeed` actually ships so
 * a regression that drops `posts.deleted_at is null` fails a test instead of
 * quietly widening the feed.
 */
async function compiledFollowingFeedSql(): Promise<string> {
  let where: unknown;
  const chain = new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "then") {
          return (resolve: (rows: never[]) => void) => resolve([]);
        }
        if (property === "where") {
          return (predicate: unknown) => {
            where = predicate;
            return chain;
          };
        }
        return () => chain;
      },
    },
  );
  const db = { select: () => chain } as unknown as Database;

  await createDrizzlePostRepository(db).listFollowingFeed({
    viewerId: USER_VIEWER,
    limit: 10,
    cursor: null,
  });

  return new PgDialect().sqlToQuery(where as never).sql;
}

describe("GET /api/v1/feed?scope=following", () => {
  it("requires a session", async () => {
    const response = await feed()(request("/api/v1/feed?scope=following"));
    expect(response.status).toBe(401);
  });

  it("requires the caller to have a profile", async () => {
    const response = await feed()(
      request("/api/v1/feed?scope=following", "token-no-profile"),
    );
    expect(response.status).toBe(403);
  });

  it("rejects an unknown scope instead of falling back", async () => {
    const response = await feed()(
      request("/api/v1/feed?scope=everyone", "token-viewer"),
    );
    expect(response.status).toBe(400);
  });

  it("returns followed public creators' posts plus the viewer's own", async () => {
    const response = await feed()(
      request("/api/v1/feed?scope=following", "token-viewer"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const list = bodies(await response.json());
    expect(list).toContain("The viewer's own post");
    expect(list).toContain("A followed creator's post");
    expect(list).not.toContain("An unrelated creator's post");
    expect(list).not.toContain("A private creator's post");
  });

  it("keeps the default feed unchanged", async () => {
    const response = await feed()(request("/api/v1/feed", "token-viewer"));
    expect(response.status).toBe(200);
    const list = bodies(await response.json());
    expect(list).toContain("An unrelated creator's post");
    expect(list).toContain("A followed creator's post");
    expect(list).not.toContain("A private creator's post");
  });

  it("paginates older eligible posts without duplicates", async () => {
    for (let index = 0; index < 3; index += 1) {
      await repository.create({
        identityId: USER_FOLLOWED,
        body: `Older followed post ${index}`,
        mediaUrl: null,
        mediaAlt: null,
        topics: [],
      });
    }

    const first = await feed()(
      request("/api/v1/feed?scope=following&limit=2", "token-viewer"),
    );
    const firstBody = (await first.json()) as {
      posts: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstBody.posts).toHaveLength(2);
    expect(firstBody.nextCursor).toBeTruthy();

    const second = await feed()(
      request(
        `/api/v1/feed?scope=following&limit=2&cursor=${encodeURIComponent(firstBody.nextCursor!)}`,
        "token-viewer",
      ),
    );
    const secondBody = (await second.json()) as {
      posts: Array<{ id: string }>;
    };
    const ids = [...firstBody.posts, ...secondBody.posts].map(
      (post) => post.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns an empty page for a viewer who follows nobody", async () => {
    const repositoryWithoutGraph = createInMemoryPostRepository({
      authors: [
        {
          identityId: USER_VIEWER,
          author: makeAuthor({ username: "ada_okoro" }),
        },
        {
          identityId: USER_FOLLOWED,
          author: makeAuthor({ username: "bola_okoro" }),
        },
      ],
    });
    await repositoryWithoutGraph.create({
      identityId: USER_FOLLOWED,
      body: "Not followed",
      mediaUrl: null,
      mediaAlt: null,
      topics: [],
    });
    const emptyService = createPostsService(repositoryWithoutGraph);
    const response = await createFeedRoute({
      sessionSource,
      service: emptyService,
    })(request("/api/v1/feed?scope=following", "token-viewer"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ posts: [], nextCursor: null });
  });

  it("excludes soft-deleted posts from the following feed", async () => {
    const followedPost = repository.rows.find(
      (row) => row.identityId === USER_FOLLOWED,
    );
    expect(followedPost).toBeTruthy();
    const deleted = await repository.softDelete({
      id: followedPost!.id,
      identityId: USER_FOLLOWED,
    });
    expect(deleted).toBe(true);

    // The row is tombstoned, not removed: the exclusion below is produced by
    // the deletion predicate, exactly as `posts.deleted_at` does in SQL.
    expect(repository.rows).toContainEqual(followedPost);
    expect(repository.deletedAt.get(followedPost!.id)).toBeInstanceOf(Date);

    const response = await feed()(
      request("/api/v1/feed?scope=following", "token-viewer"),
    );
    expect(response.status).toBe(200);
    const list = bodies(await response.json());
    expect(list).not.toContain("A followed creator's post");
    expect(list).toContain("The viewer's own post");

    // The same tombstone still disappears from the default feed, so the rule is
    // shared rather than special-cased for the Following scope.
    const defaultFeed = await feed()(request("/api/v1/feed", "token-viewer"));
    expect(bodies(await defaultFeed.json())).not.toContain(
      "A followed creator's post",
    );
  });
});

describe("following-feed SQL", () => {
  it("keeps the deleted_at predicate in the query the repository ships", async () => {
    const sql = await compiledFollowingFeedSql();

    expect(sql).toContain('"posts"."deleted_at" is null');
    expect(sql).toContain('"posts"."identity_id" = $1');
    expect(sql).toContain('"follows"."following_identity_id" is not null');
    expect(sql).toContain('"profiles"."visibility" = $2');
  });
});
