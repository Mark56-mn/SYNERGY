import { randomUUID } from "node:crypto";

import {
  UsernameConflictError,
  type CreateProfileInput,
  type ProfileRecord,
  type ProfileRepository,
  type UpdateProfileInput,
} from "@/modules/profile/repository";

/**
 * In-memory profile repository — a TEST DOUBLE, not production data access.
 *
 * It mirrors the real repository's contract, including the two behaviours the
 * tests depend on: identity-level idempotency and a UNIQUE handle. Persistence
 * against real Neon is proved separately by `scripts/profile-live-check.mjs`;
 * these tests prove the authorization and validation logic around it.
 */

export function makeProfile(
  overrides: Partial<ProfileRecord> & { identityId: string; username: string },
): ProfileRecord {
  const fixed = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: randomUUID(),
    identityId: overrides.identityId,
    username: overrides.username,
    displayName: overrides.displayName ?? "Test Member",
    bio: overrides.bio ?? null,
    avatarUrl: overrides.avatarUrl ?? null,
    visibility: overrides.visibility ?? "public",
    createdAt: overrides.createdAt ?? fixed,
    updatedAt: overrides.updatedAt ?? fixed,
  };
}

export interface InMemoryProfileRepository extends ProfileRepository {
  rows: Map<string, ProfileRecord>;
}

export function createInMemoryProfileRepository(
  seed: ProfileRecord[] = [],
): InMemoryProfileRepository {
  const rows = new Map<string, ProfileRecord>(
    seed.map((record) => [record.identityId, record]),
  );

  function takenByOther(username: string, exceptIdentity?: string): boolean {
    return [...rows.values()].some(
      (record) =>
        record.username === username && record.identityId !== exceptIdentity,
    );
  }

  return {
    rows,

    async findByIdentity(identityId: string) {
      return rows.get(identityId) ?? null;
    },

    async findByUsername(username: string) {
      return (
        [...rows.values()].find((record) => record.username === username) ??
        null
      );
    },

    async create(input: CreateProfileInput) {
      const existing = rows.get(input.identityId);
      if (existing) {
        return { profile: existing, created: false };
      }
      if (takenByOther(input.username)) {
        throw new UsernameConflictError();
      }
      const record = makeProfile(input);
      rows.set(record.identityId, record);
      return { profile: record, created: true };
    },

    async updateByIdentity(identityId: string, patch: UpdateProfileInput) {
      const existing = rows.get(identityId);
      if (!existing) {
        return null;
      }
      if (
        patch.username !== undefined &&
        takenByOther(patch.username, identityId)
      ) {
        throw new UsernameConflictError();
      }
      const updated: ProfileRecord = {
        ...existing,
        username: patch.username ?? existing.username,
        displayName: patch.displayName ?? existing.displayName,
        bio: patch.bio !== undefined ? patch.bio : existing.bio,
        avatarUrl:
          patch.avatarUrl !== undefined ? patch.avatarUrl : existing.avatarUrl,
        visibility: patch.visibility ?? existing.visibility,
        updatedAt: new Date(),
      };
      rows.set(identityId, updated);
      return updated;
    },

    async usernameTaken(username: string) {
      return takenByOther(username);
    },
  };
}
