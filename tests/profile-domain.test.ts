import { describe, expect, it } from "vitest";

import {
  BIO_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  avatarUrlSchema,
  bioSchema,
  normalizeUsername,
  profileOnboardingSchema,
  profileUpdateSchema,
  profileVisibilitySchema,
  usernameInputSchema,
  usernameSchema,
} from "@synergy/domain";

/**
 * TASK-007 profile contracts — pure functions and schemas only.
 *
 * These prove the rules everything else relies on: one canonical spelling per
 * handle, a two-value visibility vocabulary the server can actually enforce, and
 * strict request shapes that cannot smuggle an identity field.
 */

describe("username normalisation", () => {
  it("lowercases, trims and drops a leading @", () => {
    expect(normalizeUsername("  Ada_OKoro ")).toBe("ada_okoro");
    expect(normalizeUsername("@ada_okoro")).toBe("ada_okoro");
    expect(normalizeUsername("@@ada")).toBe("ada");
  });

  it("is idempotent", () => {
    const once = normalizeUsername("@Ada_Okoro");
    expect(normalizeUsername(once)).toBe(once);
  });

  it("normalises before validating, so case cannot create a second handle", () => {
    expect(usernameInputSchema.parse("Ada_OKoro")).toBe("ada_okoro");
    expect(usernameInputSchema.safeParse("ada okoro").success).toBe(false);
    expect(usernameInputSchema.safeParse("ada-okoro").success).toBe(false);
    expect(usernameInputSchema.safeParse("ab").success).toBe(false);
    expect(
      usernameInputSchema.safeParse("a".repeat(USERNAME_MAX_LENGTH + 1))
        .success,
    ).toBe(false);
    expect(
      usernameSchema.safeParse("a".repeat(USERNAME_MAX_LENGTH)).success,
    ).toBe(true);
  });
});

describe("visibility vocabulary", () => {
  it("is public or private only", () => {
    expect([...profileVisibilitySchema.options].sort()).toEqual([
      "private",
      "public",
    ]);
    // Follower-scoped visibility is not offered until a follow graph exists;
    // the schema must not accept a promise the server cannot keep.
    expect(profileVisibilitySchema.safeParse("followers").success).toBe(false);
  });
});

describe("field bounds", () => {
  it("accepts https avatar links only", () => {
    expect(avatarUrlSchema.safeParse("https://cdn.example/a.png").success).toBe(
      true,
    );
    expect(avatarUrlSchema.safeParse("http://cdn.example/a.png").success).toBe(
      false,
    );
    expect(avatarUrlSchema.safeParse("javascript:alert(1)").success).toBe(
      false,
    );
    expect(
      avatarUrlSchema.safeParse(`https://cdn.example/${"a".repeat(3000)}`)
        .success,
    ).toBe(false);
  });

  it("bounds the bio and trims it", () => {
    expect(bioSchema.parse("  hello  ")).toBe("hello");
    expect(bioSchema.safeParse("a".repeat(BIO_MAX_LENGTH)).success).toBe(true);
    expect(bioSchema.safeParse("a".repeat(BIO_MAX_LENGTH + 1)).success).toBe(
      false,
    );
  });
});

describe("request schemas", () => {
  it("defaults onboarding visibility to public", () => {
    const parsed = profileOnboardingSchema.parse({
      username: "ada_okoro",
      displayName: "Ada Okoro",
    });
    expect(parsed.visibility).toBe("public");
  });

  it("rejects a browser-supplied identity field (mass assignment)", () => {
    const result = profileOnboardingSchema.safeParse({
      username: "ada_okoro",
      displayName: "Ada Okoro",
      identityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one field on update", () => {
    expect(profileUpdateSchema.safeParse({}).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ bio: null }).success).toBe(true);
    expect(
      profileUpdateSchema.safeParse({ displayName: "New Name" }).success,
    ).toBe(true);
  });
});
