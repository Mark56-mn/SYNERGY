import { describe, expect, it } from "vitest";

import { createSocialGraphService } from "@/modules/social-graph/service";

import { createInMemorySocialGraphRepository } from "./helpers/social-graph-double";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb";
const USER_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const NO_PROFILE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function graph() {
  return createInMemorySocialGraphRepository({
    targets: [
      { identityId: USER_A, username: "ada_okoro" },
      { identityId: USER_B, username: "bola_okoro" },
      { identityId: USER_C, username: "chi_okoro", visibility: "private" },
    ],
    profiles: [USER_A, USER_B, USER_C],
  });
}

const session = (userId: string) => ({ userId, roles: ["member"] as const });

describe("social-graph service", () => {
  it("denies anonymous follow and unfollow", async () => {
    const repository = graph();
    const service = createSocialGraphService(repository);

    await expect(service.follow(null, "bola_okoro")).rejects.toMatchObject({
      code: "unauthorized",
    });
    await expect(service.unfollow(null, "bola_okoro")).rejects.toMatchObject({
      code: "unauthorized",
    });
    expect(repository.edges.size).toBe(0);
  });

  it("requires the caller to have a profile", async () => {
    const repository = graph();
    const service = createSocialGraphService(repository);

    await expect(
      service.follow(session(NO_PROFILE), "bola_okoro"),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(repository.edges.size).toBe(0);
  });

  it("creates exactly one edge for the verified caller", async () => {
    const repository = graph();
    const service = createSocialGraphService(repository);

    const state = await service.follow(session(USER_A), "bola_okoro");

    expect(state).toEqual({
      isFollowing: true,
      followerCount: 1,
      followingCount: 0,
    });
    expect(repository.edgeCount(USER_A, USER_B)).toBe(1);
  });

  it("is idempotent when a follow is repeated", async () => {
    const repository = graph();
    const service = createSocialGraphService(repository);

    await service.follow(session(USER_A), "bola_okoro");
    const state = await service.follow(session(USER_A), "bola_okoro");

    expect(state.isFollowing).toBe(true);
    expect(state.followerCount).toBe(1);
    expect(repository.edges.size).toBe(1);
  });

  it("rejects following yourself", async () => {
    const repository = graph();
    const service = createSocialGraphService(repository);

    await expect(
      service.follow(session(USER_A), "ada_okoro"),
    ).rejects.toMatchObject({ code: "bad_request" });
    expect(repository.edges.size).toBe(0);
  });

  it("answers missing and private targets with the same 404 shape", async () => {
    const service = createSocialGraphService(graph());

    const missing = await service
      .follow(session(USER_A), "nobody_here")
      .catch((error) => error);
    const privateTarget = await service
      .follow(session(USER_A), "chi_okoro")
      .catch((error) => error);

    expect(missing).toMatchObject({
      code: "not_found",
      safeMessage: "Profile not found.",
    });
    expect(privateTarget).toMatchObject({
      code: "not_found",
      safeMessage: "Profile not found.",
    });
    expect(JSON.stringify(missing)).toBe(JSON.stringify(privateTarget));
  });

  it("removes only the caller's edge on unfollow", async () => {
    const repository = createInMemorySocialGraphRepository({
      targets: [
        { identityId: USER_A, username: "ada_okoro" },
        { identityId: USER_B, username: "bola_okoro" },
        { identityId: USER_C, username: "chi_okoro" },
      ],
      profiles: [USER_A, USER_B, USER_C],
      edges: [
        [USER_A, USER_B],
        [USER_C, USER_B],
      ],
    });
    const service = createSocialGraphService(repository);

    const state = await service.unfollow(session(USER_A), "bola_okoro");

    expect(state.isFollowing).toBe(false);
    expect(repository.edgeCount(USER_A, USER_B)).toBe(0);
    expect(repository.edgeCount(USER_C, USER_B)).toBe(1);
  });

  it("treats a repeated unfollow as success", async () => {
    const repository = graph();
    const service = createSocialGraphService(repository);

    await service.follow(session(USER_A), "bola_okoro");
    await service.unfollow(session(USER_A), "bola_okoro");
    const state = await service.unfollow(session(USER_A), "bola_okoro");

    expect(state).toEqual({
      isFollowing: false,
      followerCount: 0,
      followingCount: 0,
    });
    expect(repository.edges.size).toBe(0);
  });

  it("reports real counts, including zero, with no identities", async () => {
    const repository = graph();
    const service = createSocialGraphService(repository);

    const empty = await service.getFollowState(session(USER_A), "bola_okoro");
    expect(empty).toEqual({
      isFollowing: false,
      followerCount: 0,
      followingCount: 0,
    });
    expect(Object.keys(empty!).sort()).toEqual([
      "followerCount",
      "followingCount",
      "isFollowing",
    ]);

    await service.follow(session(USER_A), "bola_okoro");
    const state = await service.getFollowState(session(USER_A), "bola_okoro");
    expect(state).toEqual({
      isFollowing: true,
      followerCount: 1,
      followingCount: 0,
    });
    expect(JSON.stringify(state)).not.toContain(USER_A);
    expect(JSON.stringify(state)).not.toContain(USER_B);
  });

  it("treats an invalid handle exactly like a missing profile", async () => {
    const service = createSocialGraphService(graph());

    const invalid = await service
      .follow(session(USER_A), "Not A Handle!")
      .catch((error) => error);
    const missing = await service
      .follow(session(USER_A), "nobody_here")
      .catch((error) => error);

    expect(invalid).toMatchObject({ code: "not_found" });
    expect(JSON.stringify(invalid)).toBe(JSON.stringify(missing));
    expect(await service.getFollowState(null, "Not A Handle!")).toBeNull();
  });

  it("hides a private profile's state from a non-owner", async () => {
    const service = createSocialGraphService(graph());

    expect(
      await service.getFollowState(session(USER_A), "chi_okoro"),
    ).toBeNull();
    expect(await service.getFollowState(null, "chi_okoro")).toBeNull();
  });

  it("never reports the owner as following themselves", async () => {
    const service = createSocialGraphService(graph());

    const state = await service.getFollowState(session(USER_A), "ada_okoro");
    expect(state).toEqual({
      isFollowing: false,
      followerCount: 0,
      followingCount: 0,
    });
  });

  it("allows unfollowing a creator who became private when an edge exists", async () => {
    const repository = createInMemorySocialGraphRepository({
      targets: [
        { identityId: USER_A, username: "ada_okoro" },
        { identityId: USER_C, username: "chi_okoro", visibility: "private" },
      ],
      profiles: [USER_A, USER_C],
      edges: [[USER_A, USER_C]],
    });
    const service = createSocialGraphService(repository);

    const state = await service.unfollow(session(USER_A), "chi_okoro");

    // The creator is now private: the edge is removed, but the aggregate counts
    // are suppressed (null) instead of being disclosed or fabricated as 0.
    expect(state).toEqual({
      isFollowing: false,
      followerCount: null,
      followingCount: null,
    });
    expect(repository.edgeCount(USER_A, USER_C)).toBe(0);
  });

  it("does not reveal a private profile via unfollow without an existing edge", async () => {
    const service = createSocialGraphService(graph());

    const noEdge = await service
      .unfollow(session(USER_A), "chi_okoro")
      .catch((error) => error);
    const missing = await service
      .unfollow(session(USER_A), "nobody_here")
      .catch((error) => error);

    expect(noEdge).toMatchObject({
      code: "not_found",
      safeMessage: "Profile not found.",
    });
    expect(JSON.stringify(noEdge)).toBe(JSON.stringify(missing));
  });

  it("still cannot follow a creator who is private", async () => {
    const service = createSocialGraphService(graph());

    await expect(
      service.follow(session(USER_A), "chi_okoro"),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
