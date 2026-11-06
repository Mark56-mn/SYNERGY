import { z } from "zod";

/**
 * Content boundary (contract shapes only) for the MVP's text/image-first feed.
 * The video pipeline is deferred (media costs/processing first) and live
 * streaming is deferred; these shapes do not introduce either.
 */

export const contentVisibilitySchema = z.enum([
  "public",
  "followers",
  "private",
]);

export const postSchema = z.object({
  id: z.uuid().optional(),
  authorId: z.uuid(),
  text: z.string().min(1).max(5000),
  /** Media URLs for image attachments only in the MVP; cap is small on purpose. */
  imageUrls: z.array(z.url()).max(4),
  visibility: contentVisibilitySchema,
});

export type Post = z.infer<typeof postSchema>;
