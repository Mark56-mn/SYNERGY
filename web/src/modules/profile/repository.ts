import "server-only";

import { eq } from "drizzle-orm";

import type { Database } from "@/server/db/client";
import type { ProfileVisibility } from "@synergy/domain";

import { profiles } from "./schema";

/**
 * Profile persistence boundary (TASK-007 §4A).
 *
 * Everything that touches the `profiles` table goes through this repository, so
 * the service layer never builds SQL and the routes never touch the database.
 * Two failure modes are modelled explicitly because they are races, not
 * validation errors:
 *
 * - `UsernameConflictError` — the UNIQUE index on `username` rejected the write
 *   (another member claimed the handle between the availability preflight and
 *   the insert/update). The caller turns this into a stable 409.
 * - Identity uniqueness is handled by `ON CONFLICT (identity_id) DO NOTHING`
 *   plus a read-back, which makes onboarding idempotent even when two requests
 *   for the same account arrive together.
 */

export interface ProfileRecord {
  id: string;
  identityId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  visibility: ProfileVisibility;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProfileInput {
  identityId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  visibility: ProfileVisibility;
}

export interface UpdateProfileInput {
  username?: string;
  displayName?: string;
  /** `undefined` leaves the value alone; `null` clears it. */
  bio?: string | null;
  avatarUrl?: string | null;
  visibility?: ProfileVisibility;
}

export interface ProfileRepository {
  findByIdentity(identityId: string): Promise<ProfileRecord | null>;
  findByUsername(username: string): Promise<ProfileRecord | null>;
  create(
    input: CreateProfileInput,
  ): Promise<{ profile: ProfileRecord; created: boolean }>;
  updateByIdentity(
    identityId: string,
    patch: UpdateProfileInput,
  ): Promise<ProfileRecord | null>;
  usernameTaken(username: string): Promise<boolean>;
}

/** A handle was claimed concurrently; the caller answers 409 without retrying. */
export class UsernameConflictError extends Error {
  constructor() {
    super("username already taken");
    this.name = "UsernameConflictError";
  }
}

/** PostgreSQL unique-violation, narrowed to the username index. */
const UNIQUE_VIOLATION = "23505";

function isUsernameConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const candidate = error as { code?: unknown; constraint?: unknown };
  return (
    candidate.code === UNIQUE_VIOLATION &&
    typeof candidate.constraint === "string" &&
    candidate.constraint.includes("username")
  );
}

export function createDrizzleProfileRepository(
  db: Database,
): ProfileRepository {
  return {
    async findByIdentity(identityId: string): Promise<ProfileRecord | null> {
      const rows = await db
        .select()
        .from(profiles)
        .where(eq(profiles.identityId, identityId))
        .limit(1);
      return rows[0] ?? null;
    },

    async findByUsername(username: string): Promise<ProfileRecord | null> {
      const rows = await db
        .select()
        .from(profiles)
        .where(eq(profiles.username, username))
        .limit(1);
      return rows[0] ?? null;
    },

    async create(
      input: CreateProfileInput,
    ): Promise<{ profile: ProfileRecord; created: boolean }> {
      try {
        const inserted = await db
          .insert(profiles)
          .values({
            identityId: input.identityId,
            username: input.username,
            displayName: input.displayName,
            bio: input.bio,
            avatarUrl: input.avatarUrl,
            visibility: input.visibility,
          })
          // Idempotent onboarding: a second request for the same identity
          // inserts nothing instead of failing or duplicating.
          .onConflictDoNothing({ target: profiles.identityId })
          .returning();
        const row = inserted[0];
        if (row) {
          return { profile: row, created: true };
        }
      } catch (error) {
        if (isUsernameConflict(error)) {
          throw new UsernameConflictError();
        }
        throw error;
      }

      // The identity already had a profile: return it so the caller can resume.
      const existing = await db
        .select()
        .from(profiles)
        .where(eq(profiles.identityId, input.identityId))
        .limit(1);
      const profile = existing[0];
      if (!profile) {
        // Only reachable if the row was deleted between the two statements.
        throw new Error("profile onboarding lost a concurrent race");
      }
      return { profile, created: false };
    },

    async updateByIdentity(
      identityId: string,
      patch: UpdateProfileInput,
    ): Promise<ProfileRecord | null> {
      const changes: Record<string, unknown> = {};
      if (patch.username !== undefined) changes["username"] = patch.username;
      if (patch.displayName !== undefined) {
        changes["displayName"] = patch.displayName;
      }
      if (patch.bio !== undefined) changes["bio"] = patch.bio;
      if (patch.avatarUrl !== undefined) changes["avatarUrl"] = patch.avatarUrl;
      if (patch.visibility !== undefined) {
        changes["visibility"] = patch.visibility;
      }
      if (Object.keys(changes).length === 0) {
        return this.findByIdentity(identityId);
      }
      changes["updatedAt"] = new Date();

      try {
        // The WHERE clause uses the VERIFIED identity, never a body-supplied id:
        // there is no code path that can update another member's profile.
        const updated = await db
          .update(profiles)
          .set(changes)
          .where(eq(profiles.identityId, identityId))
          .returning();
        return updated[0] ?? null;
      } catch (error) {
        if (isUsernameConflict(error)) {
          throw new UsernameConflictError();
        }
        throw error;
      }
    },

    async usernameTaken(username: string): Promise<boolean> {
      const rows = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.username, username))
        .limit(1);
      return rows.length > 0;
    },
  };
}
