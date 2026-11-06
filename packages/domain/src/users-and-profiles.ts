import { z } from "zod";

/**
 * Users and profiles boundary (contract shapes only).
 *
 * Identity authority is Supabase Auth. The application database keys profiles
 * by the Supabase Auth user id — a UUID owned by the identity provider, never
 * accepted from a browser as proof of identity, and never paired with any
 * password column (no second password system).
 *
 * Visibility policy detail is TASK-006B's job; these schemas describe the
 * contract shape only.
 */

export const userIdSchema = z.uuid();

export const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_]+$/, "must be lowercase letters, numbers or underscores");

export const profileVisibilitySchema = z.enum([
  "public",
  "followers",
  "private",
]);

export const profileSchema = z.object({
  userId: userIdSchema,
  username: usernameSchema,
  displayName: z.string().min(1).max(80),
  bio: z.string().max(280).optional(),
  avatarUrl: z.url().optional(),
  visibility: profileVisibilitySchema,
});

export type UserId = z.infer<typeof userIdSchema>;
export type Username = z.infer<typeof usernameSchema>;
export type ProfileVisibility = z.infer<typeof profileVisibilitySchema>;
export type Profile = z.infer<typeof profileSchema>;
