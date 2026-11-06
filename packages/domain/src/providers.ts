import { z } from "zod";

/**
 * Provider / business profile boundary (contract shapes only).
 *
 * Providers may be individuals or businesses (confirmed product rule). Both
 * provider types are supported in the domain design; business staffing and
 * service-areas detail belongs to their implementation tasks.
 */

export const providerTypeSchema = z.enum(["individual", "business"]);

export const providerProfileSchema = z.object({
  userId: z.uuid(),
  providerType: providerTypeSchema,
  displayName: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  /** Broad service areas (city / area names) — coarse geographic descriptors only. */
  serviceAreas: z.array(z.string().min(1).max(80)).max(20),
});

export type ProviderType = z.infer<typeof providerTypeSchema>;
export type ProviderProfile = z.infer<typeof providerProfileSchema>;
