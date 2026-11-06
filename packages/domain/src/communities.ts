import { z } from "zod";

/**
 * Communities boundary (contract shapes only).
 * Communities are "if in MVP" per the roadmap; these shapes exist so later
 * community work plugs into a stable contract. Public/private/hidden is the
 * blueprint's community visibility model.
 */

export const communityVisibilitySchema = z.enum([
  "public",
  "private",
  "hidden",
]);

export const communitySchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "must be lowercase letters, numbers or hyphens"),
  description: z.string().max(500).optional(),
  visibility: communityVisibilitySchema,
});

export type CommunityVisibility = z.infer<typeof communityVisibilitySchema>;
export type Community = z.infer<typeof communitySchema>;
