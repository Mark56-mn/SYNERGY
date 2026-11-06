import { z } from "zod";

/**
 * Booking-request boundary (contract shapes only).
 *
 * Confirmed product rules reflected here as contract shapes:
 * - No booking is confirmed before the provider accepts (D-005).
 * - Request states include pending, accepted, declined, expired, cancelled,
 *   in-progress, completed and disputed (blueprint's confirmed state set).
 *
 * The state-machine enforcement and provider-acceptance logic for these
 * states belongs to their own implementation tasks; this module only pins
 * the vocabulary both clients share. Prices/totals/escrow are deliberately
 * absent (payments are out of MVP scope).
 */

export const bookingRequestStateSchema = z.enum([
  "pending",
  "accepted",
  "declined",
  "expired",
  "cancelled",
  "in_progress",
  "completed",
  "disputed",
]);

export const bookingRequestSchema = z.object({
  id: z.uuid().optional(),
  listingId: z.uuid(),
  customerUserId: z.uuid(),
  providerUserId: z.uuid(),
  state: bookingRequestStateSchema,
  /** Client-supplied timestamps are never trusted; shape exists for transport. */
  createdAt: z.iso.datetime().optional(),
});

export type BookingRequestState = z.infer<typeof bookingRequestStateSchema>;
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
