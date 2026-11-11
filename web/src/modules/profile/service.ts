import "server-only";

import {
  normalizeUsername,
  profileOnboardingSchema,
  profileUpdateSchema,
  usernameInputSchema,
  type ProfileOnboardingInput,
  type ProfileUpdateInput,
  type ProfileVisibility,
} from "@synergy/domain";

import type { Session } from "@/server/auth/session";
import { requireAuthenticatedUser } from "@/server/authz";
import { getEnv } from "@/server/env";
import { badRequest, conflict, notFound } from "@/server/http/errors";

import { assertAvatarUrlAllowed } from "./avatar-upload";

import {
  UsernameConflictError,
  type ProfileRecord,
  type ProfileRepository,
  type UpdateProfileInput,
} from "./repository";

/**
 * Profile service — the ONE place that decides who may read or write a profile.
 *
 * Security properties proved by the tests next to this module:
 *
 * 1. The acting identity ALWAYS comes from a verified `Session`. No method
 *    accepts a user/identity id from request data, so there is no IDOR path and
 *    no mass-assignment path (the request schemas are strict too).
 * 2. A private profile is answered as **not found** to anyone but its owner.
 *    "Private" must not become an existence oracle, and a 403 would already
 *    reveal that the handle exists.
 * 3. Public responses are built from an explicit field allowlist. The auth
 *    subject, internal profile id and timestamps never leave this layer.
 * 4. Onboarding is idempotent: an interrupted or retried request returns the
 *    existing profile instead of creating a second one.
 */

/**
 * Public profile payload — the allowlist from `packages/domain`.
 * Nothing else may be added here without a privacy review.
 */
export interface PublicProfileDto {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
}

/** Owner-only payload: adds the settings the member controls. */
export interface OwnerProfileDto extends PublicProfileDto {
  visibility: ProfileVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileView {
  profile: ProfileRecord;
  isOwner: boolean;
}

export interface ProfileService {
  getOwnProfile(session: Session | null): Promise<ProfileRecord | null>;
  completeOnboarding(
    session: Session | null,
    input: ProfileOnboardingInput,
  ): Promise<{ profile: ProfileRecord; created: boolean }>;
  updateOwnProfile(
    session: Session | null,
    input: ProfileUpdateInput,
  ): Promise<ProfileRecord>;
  checkUsername(input: { username: string }): Promise<{
    username: string;
    available: boolean;
  }>;
  /** `null` when no profile is visible to this viewer (absent OR private). */
  findProfileForViewer(
    handle: string,
    session: Session | null,
  ): Promise<ProfileView | null>;
  /** Visibility of a profile by verified identity id, or null when absent. */
  getProfileVisibility(
    identityId: string,
  ): Promise<"public" | "private" | null>;
}

/**
 * When the deployment is Cloudinary-backed, only URLs produced by the
 * server-signed upload flow (fixed folder, generated public_id) may be
 * persisted — this closes the "PATCH an arbitrary https URL" bypass.
 * In the stub/dev environment the https-only domain check still applies.
 */
function assertProfileAvatarUrlAllowed(
  url: string | null | undefined,
  userId?: string,
): void {
  let cloudinaryEnabled = false;
  let cloudName: string | undefined;
  let mediaEnabled = false;
  try {
    const env = getEnv();
    cloudinaryEnabled = env.MEDIA_PROVIDER_ADAPTER === "cloudinary";
    cloudName = env.CLOUDINARY_CLOUD_NAME;
    if (env.SUPABASE_MEDIA_URL && env.SUPABASE_MEDIA_SECRET_KEY) {
      mediaEnabled = true;
    }
  } catch {
    // Unconfigured environments keep the https-only contract.
  }
  assertAvatarUrlAllowed(
    url,
    {
      cloudinaryEnabled,
      cloudName,
      mediaEnabled,
      mediaUrl: undefined,
      mediaBucket: undefined,
    },
    userId,
  );
}

/** Empty/whitespace text becomes SQL NULL so "clear the bio" is expressible. */
function nullableText(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function toPublicProfileDto(record: ProfileRecord): PublicProfileDto {
  return {
    username: record.username,
    displayName: record.displayName,
    bio: record.bio,
    avatarUrl: record.avatarUrl,
  };
}

export function toOwnerProfileDto(record: ProfileRecord): OwnerProfileDto {
  return {
    ...toPublicProfileDto(record),
    visibility: record.visibility,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function createProfileService(
  repository: ProfileRepository,
): ProfileService {
  return {
    async getOwnProfile(
      session: Session | null,
    ): Promise<ProfileRecord | null> {
      const user = requireAuthenticatedUser(session);
      return repository.findByIdentity(user.userId);
    },

    async completeOnboarding(
      session: Session | null,
      input: ProfileOnboardingInput,
    ): Promise<{ profile: ProfileRecord; created: boolean }> {
      const user = requireAuthenticatedUser(session);
      const parsed = profileOnboardingSchema.safeParse(input);
      if (!parsed.success) {
        throw badRequest("Invalid input in: " + fieldNamesOf(parsed.error));
      }

      // Resume: a member who already has a profile is never given a second one,
      // and the submitted values do not overwrite the stored profile here.
      const existing = await repository.findByIdentity(user.userId);
      if (existing) {
        return { profile: existing, created: false };
      }

      const onboardingAvatar = nullableText(parsed.data.avatarUrl) ?? null;
      assertProfileAvatarUrlAllowed(onboardingAvatar, user.userId);

      try {
        return await repository.create({
          identityId: user.userId,
          username: parsed.data.username,
          displayName: parsed.data.displayName,
          bio: nullableText(parsed.data.bio) ?? null,
          avatarUrl: onboardingAvatar,
          visibility: parsed.data.visibility,
        });
      } catch (error) {
        if (error instanceof UsernameConflictError) {
          throw conflict("That username is not available.");
        }
        throw error;
      }
    },

    async updateOwnProfile(
      session: Session | null,
      input: ProfileUpdateInput,
    ): Promise<ProfileRecord> {
      const user = requireAuthenticatedUser(session);
      const parsed = profileUpdateSchema.safeParse(input);
      if (!parsed.success) {
        throw badRequest("Invalid input in: " + fieldNamesOf(parsed.error));
      }

      const existing = await repository.findByIdentity(user.userId);
      if (!existing) {
        throw notFound("Profile not found.");
      }

      const patch: UpdateProfileInput = {};
      if (parsed.data.username !== undefined)
        patch.username = parsed.data.username;
      if (parsed.data.displayName !== undefined) {
        patch.displayName = parsed.data.displayName;
      }
      if (parsed.data.bio !== undefined)
        patch.bio = nullableText(parsed.data.bio);
      if (parsed.data.avatarUrl !== undefined) {
        patch.avatarUrl = nullableText(parsed.data.avatarUrl);
        assertProfileAvatarUrlAllowed(patch.avatarUrl, user.userId);
      }
      if (parsed.data.visibility !== undefined) {
        patch.visibility = parsed.data.visibility;
      }

      try {
        const updated = await repository.updateByIdentity(user.userId, patch);
        if (!updated) {
          throw notFound("Profile not found.");
        }
        return updated;
      } catch (error) {
        if (error instanceof UsernameConflictError) {
          throw conflict("That username is not available.");
        }
        throw error;
      }
    },

    async checkUsername(input: { username: string }): Promise<{
      username: string;
      available: boolean;
    }> {
      const parsed = usernameInputSchema.safeParse(input.username);
      if (!parsed.success) {
        throw badRequest("Invalid input in: username");
      }
      const taken = await repository.usernameTaken(parsed.data);
      return { username: parsed.data, available: !taken };
    },

    async findProfileForViewer(
      handle: string,
      session: Session | null,
    ): Promise<ProfileView | null> {
      // An unparseable handle cannot resolve, so it is answered exactly like a
      // missing one — no format oracle for enumeration.
      const parsed = usernameInputSchema.safeParse(handle);
      if (!parsed.success) {
        return null;
      }
      const profile = await repository.findByUsername(parsed.data);
      if (!profile) {
        return null;
      }
      const isOwner = session !== null && session.userId === profile.identityId;
      if (!isOwner && profile.visibility !== "public") {
        // Private profiles are indistinguishable from absent ones.
        return null;
      }
      return { profile, isOwner };
    },

    async getProfileVisibility(
      identityId: string,
    ): Promise<"public" | "private" | null> {
      const profile = await repository.findByIdentity(identityId);
      return profile ? profile.visibility : null;
    },
  };
}

/** Field NAMES only — never the submitted values (SECURITY_RULES.md). */
function fieldNamesOf(error: {
  issues: Array<{ path: Array<string | number | symbol> }>;
}): string {
  const names = [
    ...new Set(
      error.issues
        .map((issue) => issue.path.map((part) => String(part)).join("."))
        .filter(Boolean),
    ),
  ];
  return names.join(", ") || "request body";
}

/** Re-exported for callers that only need the normaliser. */
export { normalizeUsername };
