import { beforeEach, describe, expect, it } from "vitest";

import {
  createPostsService,
  decodeFeedCursor,
  encodeFeedCursor,
  parsePageLimit,
  toPostView,
} from "@/modules/posts/service";
import type { Session } from "@/server/auth/session";
import { AppError } from "@/server/http/errors";
import { extractTopics, formatPostTime } from "@synergy/domain";

import {
  createInMemoryPostRepository,
  makeAuthor,
  makePost,
  type InMemoryPostRepository,
} from "./helpers/posts-double";

/**
 * TASK-008A publishing service — authorization, visibility and DTO rules.
 * Repository is an in-memory double; persistence is proved by the live check.
 */

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb";

const sessionA: Session = { userId: USER_A, roles: ["member"] };
const sessionB: Session = { userId: USER_B, roles: ["member"] };

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

function codeOf(error: unknown): string {
  expect(error).toBeInstanceOf(AppError);
  return (error as AppError).code;
}

describe("publishing", () => {
  it("requires a verified session", async () => {
    const error = await service
      .createPost(null, { body: "Hello" })
      .catch((caught: unknown) => caught);
    expect(codeOf(error)).toBe("unauthorized");
    expect(repository.rows).toHaveLength(0);
  });

  it("requires a profile so every post is attributable", async () => {
    const stranger = createPostsService(repository);
    const error = await stranger
      .createPost(
        { userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", roles: ["member"] },
        { body: "Hello" },
      )
      .catch((caught: unknown) => caught);
    expect(codeOf(error)).toBe("forbidden");
    expect(repository.rows).toHaveLength(0);
  });

  it("publishes as the session subject and extracts topics", async () => {
    const post = await service.createPost(sessionA, {
      body: "Finished three shirts today. #tailoring #smallbusiness",
    });

    expect(post.author.username).toBe("ada_okoro");
    expect(post.topics).toEqual(["tailoring", "smallbusiness"]);
    expect(post.isOwner).toBe(true);
    expect(repository.rows[0]?.identityId).toBe(USER_A);
  });

  it("rejects a body that tries to name another author (mass assignment)", async () => {
    const error = await service
      .createPost(sessionA, {
        body: "Hello",
        identityId: USER_B,
      } as never)
      .catch((caught: unknown) => caught);
    expect(codeOf(error)).toBe("bad_request");
    expect(repository.rows).toHaveLength(0);
  });

  it("rejects an empty or over-long caption", async () => {
    await expect(
      service.createPost(sessionA, { body: "   " }),
    ).rejects.toMatchObject({ code: "bad_request" });
    await expect(
      service.createPost(sessionA, { body: "x".repeat(1001) }),
    ).rejects.toMatchObject({ code: "bad_request" });
  });

  it("refuses a non-https photo URL", async () => {
    const error = await service
      .createPost(sessionA, { body: "Look", mediaUrl: "http://cdn/x.jpg" })
      .catch((caught: unknown) => caught);
    expect(codeOf(error)).toBe("bad_request");
  });
});

describe("feed visibility", () => {
  it("hides a private profile's posts from anonymous and other viewers", async () => {
    repository.authors.set(
      USER_B,
      makeAuthor({ username: "bola_okoro", visibility: "private" }),
    );
    repository.rows.push(
      makePost({
        identityId: USER_B,
        author: makeAuthor({ username: "bola_okoro", visibility: "private" }),
        body: "Private author post",
      }),
      makePost({
        identityId: USER_A,
        author: makeAuthor({ username: "ada_okoro" }),
        body: "Public post",
      }),
    );

    const anonymous = await service.getFeed(null);
    expect(anonymous.posts.map((post) => post.body)).toEqual(["Public post"]);

    const otherMember = await service.getFeed(sessionA);
    expect(otherMember.posts.map((post) => post.body)).toEqual(["Public post"]);

    const owner = await service.getFeed(sessionB);
    expect(owner.posts.map((post) => post.body).sort()).toEqual([
      "Private author post",
      "Public post",
    ]);
  });

  it("paginates newest-first without dropping or duplicating posts", async () => {
    for (let index = 0; index < 5; index += 1) {
      repository.rows.push(
        makePost({
          identityId: USER_A,
          author: makeAuthor({ username: "ada_okoro" }),
          body: `Post ${index}`,
          createdAt: new Date(`2026-01-0${index + 1}T00:00:00.000Z`),
        }),
      );
    }
    const first = await service.getFeed(null, { limit: 2 });
    expect(first.posts.map((post) => post.body)).toEqual(["Post 4", "Post 3"]);
    const second = await service.getFeed(null, {
      limit: 2,
      cursor: first.nextCursor,
    });
    expect(second.posts.map((post) => post.body)).toEqual(["Post 2", "Post 1"]);
    const third = await service.getFeed(null, {
      limit: 2,
      cursor: second.nextCursor,
    });
    expect(third.posts.map((post) => post.body)).toEqual(["Post 0"]);
    expect(third.nextCursor).toBeNull();
  });

  it("answers a public profile's posts to anyone, including their owner", async () => {
    repository.rows.push(
      makePost({
        identityId: USER_A,
        author: makeAuthor({ username: "ada_okoro" }),
        body: "Hello",
      }),
    );
    expect(
      (await service.getPostsByUsername(null, "ada_okoro")).posts,
    ).toHaveLength(1);
    expect(
      (await service.getPostsByUsername(sessionA, "ada_okoro")).posts[0]
        ?.isOwner,
    ).toBe(true);
    expect(
      (await service.getPostsByUsername(sessionA, "nobody")).posts,
    ).toHaveLength(0);
  });
});

describe("deletion", () => {
  it("deletes only the caller's own post and answers 404 otherwise", async () => {
    const post = await service.createPost(sessionA, { body: "Mine" });

    await expect(service.deletePost(sessionB, post.id)).rejects.toMatchObject({
      code: "not_found",
    });
    expect(repository.rows).toHaveLength(1);

    await service.deletePost(sessionA, post.id);
    expect(repository.rows).toHaveLength(0);
  });

  it("answers 404 for a malformed id rather than touching data", async () => {
    await expect(
      service.deletePost(sessionA, "not-a-uuid"),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("likes", () => {
  it("requires a session and a visible post", async () => {
    const post = await service.createPost(sessionA, { body: "Like me" });
    await expect(service.setLike(null, post.id, true)).rejects.toMatchObject({
      code: "unauthorized",
    });
    await expect(
      service.setLike(sessionB, "11111111-1111-4111-8111-111111111111", true),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("is idempotent for repeated likes and reversible", async () => {
    const post = await service.createPost(sessionA, { body: "Like me" });

    expect(await service.setLike(sessionB, post.id, true)).toEqual({
      likeCount: 1,
      liked: true,
    });
    expect(await service.setLike(sessionB, post.id, true)).toEqual({
      likeCount: 1,
      liked: true,
    });
    expect(await service.setLike(sessionB, post.id, false)).toEqual({
      likeCount: 0,
      liked: false,
    });
  });
});

describe("response allowlists", () => {
  it("never exposes an auth subject or internal fields", async () => {
    const post = await service.createPost(sessionA, {
      body: "Hello #tag",
    });
    const dto = toPostView(
      {
        ...repository.rows[0]!,
        likeCount: 0,
        likedByViewer: false,
      },
      null,
    );

    expect(Object.keys(dto).sort()).toEqual([
      "author",
      "body",
      "createdAt",
      "id",
      "isOwner",
      "likeCount",
      "likedByViewer",
      "mediaAlt",
      "mediaUrl",
      "timeLabel",
      "topics",
    ]);
    const serialised = JSON.stringify(dto);
    expect(serialised).not.toContain(USER_A);
    expect(serialised).not.toContain("identityId");
    expect(serialised).not.toContain("visibility");
    expect(post.id).toBe(dto.id);
  });
});

describe("cursors and limits", () => {
  it("round-trips a cursor and rejects a tampered one", () => {
    const cursor = {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    };
    expect(decodeFeedCursor(encodeFeedCursor(cursor))).toEqual(cursor);
    expect(() => decodeFeedCursor("not-a-cursor")).toThrow();
    expect(() =>
      decodeFeedCursor(Buffer.from("hello|world").toString("base64url")),
    ).toThrow();
  });

  it("clamps page sizes", () => {
    expect(parsePageLimit(null)).toBe(10);
    expect(parsePageLimit("3")).toBe(3);
    expect(parsePageLimit("9999")).toBe(20);
    expect(parsePageLimit("-2")).toBe(10);
  });
});

describe("domain helpers", () => {
  it("extracts unique, bounded, non-URL topics", () => {
    expect(extractTopics("#Design #design #UX")).toEqual(["design", "ux"]);
    expect(extractTopics("https://x.test/#fragment and abc#def")).toEqual([]);
    expect(extractTopics("#aa #bb #cc #dd #ee #ff #gg")).toHaveLength(5);
  });

  it("formats a stable relative label", () => {
    const now = new Date("2026-01-10T12:00:00.000Z");
    expect(formatPostTime(new Date("2026-01-10T11:59:30.000Z"), now)).toBe(
      "now",
    );
    expect(formatPostTime(new Date("2026-01-10T11:30:00.000Z"), now)).toBe(
      "30m",
    );
    expect(formatPostTime(new Date("2026-01-10T09:00:00.000Z"), now)).toBe(
      "3h",
    );
    expect(formatPostTime(new Date("2026-01-07T12:00:00.000Z"), now)).toBe(
      "3d",
    );
    expect(formatPostTime(new Date("2025-12-01T12:00:00.000Z"), now)).toBe(
      "1 Dec",
    );
  });
});
