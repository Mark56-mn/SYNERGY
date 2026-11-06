import { z } from "zod";

/**
 * Messaging boundary (contract shapes only) for the pre-hire enquiry flow.
 *
 * CONFIRMED cap carried as a contract constant (not a new rule): pre-hire
 * messaging is capped at 10 messages per person, voice notes included
 * (Decision Register D-006). Enforcement is server-side in its own task;
 * both clients share the constant so the cap never diverges between clients.
 */

export const PREHIRE_MESSAGE_CAP = 10;

export const messageSchema = z
  .object({
    id: z.uuid().optional(),
    threadId: z.uuid(),
    senderUserId: z.uuid(),
    body: z.string().max(4000).optional(),
    /** Voice note as a hosted media reference; null when absent. */
    voiceNoteUrl: z.url().nullish(),
  })
  .refine((m) => (m.body?.length ?? 0) > 0 || !!m.voiceNoteUrl, {
    message: "a message needs text or a voice note",
  });

export type Message = z.infer<typeof messageSchema>;
