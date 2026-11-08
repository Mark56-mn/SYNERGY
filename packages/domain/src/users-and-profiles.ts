import { z } from "zod";

/**
 * Users and profiles boundary (contract shapes only).
 *
 * Identity authority is Supabase Auth. The application database keys profiles
 * by the Supabase Auth user id — a UUID owned by the identity provider, never
 * accepted from a browser as proof of identity, and never paired with any
 * password column (no second password system).
 *
 * TASK-007 settles the two things this contract previously left to a later
 * task:
 *
 * - **Visibility vocabulary** is `public` | `private`. The earlier placeholder
 *   also listed `followers`, but follower-scoped visibility cannot be enforced
 *   before a follow graph exists (TASK-008/TASK-009). Shipping a value the
 *   server cannot honour would be a false privacy promise, so it is removed
 *   here and returns only with the graph that makes it meaningful.
 * - **Username shape** is fixed and normalisable: lowercase letters, digits and
 *   underscores, 3–30 characters. Input is normalised before validation so
 *   `Ada_OKoro`, `@ada_okoro` and `ada_okoro` cannot become three accounts.
 *
 * These are contract shapes plus pure normalisation/validation helpers — no
 * database or framework access, so the Android app can consume the same rules.
 */

export const userIdSchema = z.uuid();

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const DISPLAY_NAME_MAX_LENGTH = 80;
export const BIO_MAX_LENGTH = 280;
export const AVATAR_URL_MAX_LENGTH = 2048;

/**
 * Canonical username normalisation. Deterministic and idempotent: trimming,
 * dropping a leading `@` (people paste handles that way) and lowercasing are
 * the only transformations, so the database stores exactly one spelling of a
 * handle and uniqueness cannot be bypassed by case.
 */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export const usernameSchema = z
  .string()
  .min(USERNAME_MIN_LENGTH)
  .max(USERNAME_MAX_LENGTH)
  .regex(/^[a-z0-9_]+$/, "must be lowercase letters, numbers or underscores");

/** Raw user input: normalised first, then validated against the canonical shape. */
export const usernameInputSchema = z
  .string()
  .trim()
  .min(1)
  .max(USERNAME_MAX_LENGTH + 1)
  .transform(normalizeUsername)
  .pipe(usernameSchema);

export const profileVisibilitySchema = z.enum(["public", "private"]);

export const displayNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(DISPLAY_NAME_MAX_LENGTH);

export const bioSchema = z.string().trim().max(BIO_MAX_LENGTH);

/**
 * Avatar is a URL ONLY in this slice (no uploads, no media pipeline): https
 * only, bounded length. An empty string is accepted by the request schemas and
 * normalised to `null` by the service so forms can clear the field.
 */
export const avatarUrlSchema = z
  .string()
  .max(AVATAR_URL_MAX_LENGTH)
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "must be an https URL");

/** Fields a member may leave out or clear without changing their identity. */
const optionalProfileFields = {
  bio: z.union([bioSchema, z.null()]).optional(),
  avatarUrl: z.union([avatarUrlSchema, z.literal(""), z.null()]).optional(),
} as const;

/**
 * Onboarding input. Strict so an unknown key (a browser-supplied `userId`,
 * `identityId` or `role`) is a validation failure rather than silently
 * discarded mass assignment. Visibility defaults to `public`, which is the
 * narrower disclosure for a member who never touches the setting.
 */
export const profileOnboardingSchema = z
  .object({
    username: usernameInputSchema,
    displayName: displayNameSchema,
    visibility: profileVisibilitySchema.default("public"),
    ...optionalProfileFields,
  })
  .strict();

/** Profile update input: every field optional, but at least one is required. */
export const profileUpdateSchema = z
  .object({
    username: usernameInputSchema.optional(),
    displayName: displayNameSchema.optional(),
    visibility: profileVisibilitySchema.optional(),
    ...optionalProfileFields,
  })
  .strict()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "provide at least one field to update",
  );

export type ProfileVisibility = z.infer<typeof profileVisibilitySchema>;
export type ProfileOnboardingInput = z.infer<typeof profileOnboardingSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** Full stored profile shape (server-side; includes the auth subject). */
export const profileSchema = z.object({
  userId: userIdSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  bio: bioSchema.optional(),
  avatarUrl: avatarUrlSchema.optional(),
  visibility: profileVisibilitySchema,
});

/**
 * Field allowlist for the PUBLIC profile DTO. Anything not named here — the
 * auth subject, internal profile id, timestamps, visibility flag — never
 * reaches an anonymous visitor.
 */
export const publicProfileSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  bio: z.string().max(BIO_MAX_LENGTH).nullable(),
  avatarUrl: z.string().max(AVATAR_URL_MAX_LENGTH).nullable(),
});

export type UserId = z.infer<typeof userIdSchema>;
export type Username = z.infer<typeof usernameSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type PublicProfile = z.infer<typeof publicProfileSchema>;
