import { beforeEach, describe, expect, it } from "vitest";

import {
  createProfileService,
  toOwnerProfileDto,
  toPublicProfileDto,
} from "@/modules/profile/service";
import type { Session } from "@/server/auth/session";
import { AppError } from "@/server/http/errors";

import {
  createInMemoryProfileRepository,
  makeProfile,
  type InMemoryProfileRepository,
} from "./helpers/profile-double";

/**
 * TASK-007 profile service — authorization and privacy logic.
 *
 * The repository is an in-memory test double, so these prove the service's
 * decisions (who may read/write, what a response may contain), not live Neon
 * persistence. That is proved by `scripts/profile-live-check.mjs`.
 */

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb";

const sessionA: Session = { userId: USER_A, roles: ["member"] };
const sessionB: Session = { userId: USER_B, roles: ["member"] };

let repository: InMemoryProfileRepository;
let service: ReturnType<typeof createProfileService>;

beforeEach(() => {
  repository = createInMemoryProfileRepository();
  service = createProfileService(repository);
});

function codeOf(error: unknown): string {
  expect(error).toBeInstanceOf(AppError);
  return (error as AppError).code;
}

describe("onboarding", () => {
  it("creates one profile with a normalised username", async () => {
    const result = await service.completeOnboarding(sessionA, {
      username: "Ada_OKoro",
      displayName: "Ada Okoro",
      visibility: "public",
    });

    expect(result.created).toBe(true);
    expect(result.profile.username).toBe("ada_okoro");
    expect(repository.rows.size).toBe(1);
  });

  it("is idempotent: a retry resumes instead of duplicating", async () => {
    const first = await service.completeOnboarding(sessionA, {
      username: "ada_okoro",
      displayName: "Ada Okoro",
      visibility: "public",
    });
    const second = await service.completeOnboarding(sessionA, {
      username: "ada_different",
      displayName: "Different Name",
      visibility: "public",
    });

    expect(second.created).toBe(false);
    expect(second.profile.id).toBe(first.profile.id);
    expect(second.profile.username).toBe("ada_okoro");
    expect(repository.rows.size).toBe(1);
  });

  it("answers 409 when another member already holds the handle", async () => {
    repository.rows.set(
      USER_B,
      makeProfile({ identityId: USER_B, username: "ada_okoro" }),
    );

    const error = await service
      .completeOnboarding(sessionA, {
        username: "Ada_Okoro",
        displayName: "Ada",
        visibility: "public",
      })
      .catch((caught: unknown) => caught);

    expect(codeOf(error)).toBe("conflict");
  });

  it("rejects an unauthenticated caller before touching data", async () => {
    const error = await service
      .completeOnboarding(null, {
        username: "ada_okoro",
        displayName: "Ada",
        visibility: "public",
      })
      .catch((caught: unknown) => caught);

    expect(codeOf(error)).toBe("unauthorized");
    expect(repository.rows.size).toBe(0);
  });

  it("rejects an identity smuggled into the input", async () => {
    const error = await service
      .completeOnboarding(sessionA, {
        username: "ada_okoro",
        displayName: "Ada",
        visibility: "public",
        identityId: USER_B,
      } as never)
      .catch((caught: unknown) => caught);

    expect(codeOf(error)).toBe("bad_request");
    expect(repository.rows.size).toBe(0);
  });
});

describe("own-profile updates", () => {
  it("updates only the caller's row", async () => {
    await service.completeOnboarding(sessionA, {
      username: "ada_okoro",
      displayName: "Ada",
      visibility: "public",
    });
    await service.completeOnboarding(sessionB, {
      username: "bola_okoro",
      displayName: "Bola",
      visibility: "public",
    });

    const updated = await service.updateOwnProfile(sessionA, {
      displayName: "Ada Updated",
      bio: "Tailor in Ibadan.",
      visibility: "private",
    });

    expect(updated.displayName).toBe("Ada Updated");
    expect(updated.visibility).toBe("private");
    expect(repository.rows.get(USER_B)?.displayName).toBe("Bola");
    expect(repository.rows.get(USER_B)?.visibility).toBe("public");
  });

  it("clears an optional field when given an empty string or null", async () => {
    await service.completeOnboarding(sessionA, {
      username: "ada_okoro",
      displayName: "Ada",
      bio: "Something",
      visibility: "public",
    });

    const cleared = await service.updateOwnProfile(sessionA, { bio: "  " });
    expect(cleared.bio).toBeNull();

    const nulled = await service.updateOwnProfile(sessionA, { bio: null });
    expect(nulled.bio).toBeNull();
  });

  it("answers 404 when the member has no profile yet", async () => {
    const error = await service
      .updateOwnProfile(sessionA, { displayName: "Ada" })
      .catch((caught: unknown) => caught);

    expect(codeOf(error)).toBe("not_found");
  });

  it("answers 409 when another member holds the requested handle", async () => {
    repository.rows.set(
      USER_B,
      makeProfile({ identityId: USER_B, username: "bola_okoro" }),
    );
    await service.completeOnboarding(sessionA, {
      username: "ada_okoro",
      displayName: "Ada",
      visibility: "public",
    });

    const error = await service
      .updateOwnProfile(sessionA, { username: "bola_okoro" })
      .catch((caught: unknown) => caught);

    expect(codeOf(error)).toBe("conflict");
    expect(repository.rows.get(USER_A)?.username).toBe("ada_okoro");
  });

  it("denies unauthenticated callers", async () => {
    const error = await service
      .updateOwnProfile(null, { displayName: "Ada" })
      .catch((caught: unknown) => caught);

    expect(codeOf(error)).toBe("unauthorized");
  });
});

describe("visibility enforcement", () => {
  it("resolves a public profile for anonymous visitors, other members and the owner", async () => {
    await service.completeOnboarding(sessionA, {
      username: "ada_okoro",
      displayName: "Ada",
      visibility: "public",
    });

    for (const viewer of [null, sessionB, sessionA]) {
      const view = await service.findProfileForViewer("ada_okoro", viewer);
      expect(view?.profile.username).toBe("ada_okoro");
    }
  });

  it("hides a private profile from everyone except its owner", async () => {
    await service.completeOnboarding(sessionA, {
      username: "ada_okoro",
      displayName: "Ada",
      visibility: "private",
    });

    expect(await service.findProfileForViewer("ada_okoro", null)).toBeNull();
    expect(
      await service.findProfileForViewer("ada_okoro", sessionB),
    ).toBeNull();

    const ownerView = await service.findProfileForViewer("ada_okoro", sessionA);
    expect(ownerView?.isOwner).toBe(true);
    expect(ownerView?.profile.visibility).toBe("private");
  });

  it("resolves handles case-insensitively but never leaks a mismatched one", async () => {
    await service.completeOnboarding(sessionA, {
      username: "ada_okoro",
      displayName: "Ada",
      visibility: "public",
    });

    const view = await service.findProfileForViewer("@Ada_OKoro", null);
    expect(view?.profile.username).toBe("ada_okoro");
    expect(await service.findProfileForViewer("nobody_here", null)).toBeNull();
    expect(await service.findProfileForViewer("bad handle!", null)).toBeNull();
  });
});

describe("response allowlists", () => {
  it("gives public viewers exactly four fields", async () => {
    await service.completeOnboarding(sessionA, {
      username: "ada_okoro",
      displayName: "Ada",
      bio: "Tailor",
      visibility: "public",
    });
    const view = await service.findProfileForViewer("ada_okoro", null);
    const dto = toPublicProfileDto(view!.profile);

    expect(Object.keys(dto).sort()).toEqual([
      "avatarUrl",
      "bio",
      "displayName",
      "username",
    ]);
    const serialised = JSON.stringify(dto);
    expect(serialised).not.toContain(USER_A);
    expect(serialised).not.toContain("identityId");
    expect(serialised).not.toContain("visibility");
  });

  it("gives the owner their settings but still no auth subject", async () => {
    await service.completeOnboarding(sessionA, {
      username: "ada_okoro",
      displayName: "Ada",
      visibility: "private",
    });
    const view = await service.findProfileForViewer("ada_okoro", sessionA);
    const dto = toOwnerProfileDto(view!.profile);

    expect(dto.visibility).toBe("private");
    expect(Object.keys(dto)).not.toContain("identityId");
    expect(JSON.stringify(dto)).not.toContain(USER_A);
  });
});

describe("username availability", () => {
  it("normalises the probe and reports a taken handle", async () => {
    await service.completeOnboarding(sessionA, {
      username: "ada_okoro",
      displayName: "Ada",
      visibility: "public",
    });

    expect(await service.checkUsername({ username: "Ada_Okoro" })).toEqual({
      username: "ada_okoro",
      available: false,
    });
    expect(await service.checkUsername({ username: "free_handle" })).toEqual({
      username: "free_handle",
      available: true,
    });
  });

  it("rejects a malformed probe instead of answering about it", async () => {
    const error = await service
      .checkUsername({ username: "not a handle" })
      .catch((caught: unknown) => caught);
    expect(codeOf(error)).toBe("bad_request");
  });
});
