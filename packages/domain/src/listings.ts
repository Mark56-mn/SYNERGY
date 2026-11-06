import { z } from "zod";

/**
 * Listings boundary (contract shapes only).
 *
 * CONFIRMED caps carried as contract constants (not new rules):
 * - Listing media target: up to 3 pictures and 2 videos (Decision Register D-007).
 *
 * Commission, guarantee badges and payment behaviour are explicitly NOT part
 * of this contract (D-015/D-016/D-019); listings carry no pricing/escrow
 * fields beyond the free-text price description the provider controls.
 */

/** Confirmed listing-media cap. */
export const MAX_LISTING_PICTURES = 3;
/** Confirmed listing-media cap. */
export const MAX_LISTING_VIDEOS = 2;

export const listingTypeSchema = z.enum(["service", "product"]);

export const mediaItemSchema = z.object({
  url: z.url(),
  mediaType: z.enum(["image", "video"]),
  /** Nullable display alternative text; accessibility contract for media. */
  altText: z.string().max(200).nullish(),
});

export const listingMediaSchema = z
  .array(mediaItemSchema)
  .max(MAX_LISTING_PICTURES + MAX_LISTING_VIDEOS);

export const listingSchema = z
  .object({
    id: z.uuid().optional(),
    providerUserId: z.uuid(),
    listingType: listingTypeSchema,
    title: z.string().min(1).max(120),
    description: z.string().max(5000),
    priceNote: z.string().max(280).optional(),
    media: listingMediaSchema,
  })
  // Enforce the confirmed picture/video split at the contract boundary.
  .superRefine((value, ctx) => {
    const pictures = value.media.filter((m) => m.mediaType === "image").length;
    const videos = value.media.filter((m) => m.mediaType === "video").length;
    if (pictures > MAX_LISTING_PICTURES) {
      ctx.addIssue({
        code: "custom",
        message: `at most ${MAX_LISTING_PICTURES} pictures are allowed per listing`,
        path: ["media"],
      });
    }
    if (videos > MAX_LISTING_VIDEOS) {
      ctx.addIssue({
        code: "custom",
        message: `at most ${MAX_LISTING_VIDEOS} videos are allowed per listing`,
        path: ["media"],
      });
    }
  });

export type ListingType = z.infer<typeof listingTypeSchema>;
export type MediaItem = z.infer<typeof mediaItemSchema>;
export type Listing = z.infer<typeof listingSchema>;
