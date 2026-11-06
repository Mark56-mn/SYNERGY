import { describe, expect, it } from "vitest";

import {
  MAX_LISTING_PICTURES,
  MAX_LISTING_VIDEOS,
  PREHIRE_MESSAGE_CAP,
  bookingRequestStateSchema,
  communityVisibilitySchema,
  listingMediaSchema,
  listingSchema,
  mediaItemSchema,
  messageSchema,
  profileSchema,
  usernameSchema,
} from "../src/index.js";

const VALID_MEDIA_ITEM = {
  url: "https://cdn.example/img.jpg",
  mediaType: "image" as const,
};

describe("listing media caps (confirmed decision D-007)", () => {
  it("exposes the confirmed cap constants", () => {
    expect(MAX_LISTING_PICTURES).toBe(3);
    expect(MAX_LISTING_VIDEOS).toBe(2);
  });

  it("rejects a 4th picture at the contract boundary", () => {
    const fourPictures = [
      VALID_MEDIA_ITEM,
      { ...VALID_MEDIA_ITEM, url: "https://cdn.example/2.jpg" },
      { ...VALID_MEDIA_ITEM, url: "https://cdn.example/3.jpg" },
      { ...VALID_MEDIA_ITEM, url: "https://cdn.example/4.jpg" },
    ];
    const result = listingSchema.safeParse({
      providerUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      listingType: "service",
      title: "Phone repair",
      description: "Repairs at Arcade area.",
      media: fourPictures,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => /pictures/.test(i.message))).toBe(
        true,
      );
    }
  });

  it("accepts a listing within the confirmed caps", () => {
    const media = listingMediaSchema.parse([
      VALID_MEDIA_ITEM,
      { ...VALID_MEDIA_ITEM, url: "https://cdn.example/2.jpg" },
      {
        url: "https://cdn.example/voice.mp4",
        mediaType: "video" as const,
      },
    ]);
    expect(media).toHaveLength(3);
  });
});

describe("pre-hire messaging cap (confirmed decision D-006)", () => {
  it("carries the confirmed cap of 10 messages per person", () => {
    expect(PREHIRE_MESSAGE_CAP).toBe(10);
  });

  it("requires a message to have text or a voice note", () => {
    const base = {
      threadId: "11111111-1111-4111-8111-111111111111",
      senderUserId: "22222222-2222-4222-8222-222222222222",
    };
    expect(messageSchema.safeParse({ ...base, body: "Hello" }).success).toBe(
      true,
    );
    expect(
      messageSchema.safeParse({
        ...base,
        voiceNoteUrl: "https://cdn.example/voice.ogg",
      }).success,
    ).toBe(true);
    expect(messageSchema.safeParse(base).success).toBe(false);
  });
});

describe("booking-request contract shape (D-005 states)", () => {
  it("pins the confirmed booking state vocabulary", () => {
    const states = bookingRequestStateSchema.options;
    expect([...states].sort()).toEqual(
      [
        "pending",
        "accepted",
        "declined",
        "expired",
        "cancelled",
        "in_progress",
        "completed",
        "disputed",
      ].sort(),
    );
  });
});

describe("profile contract shapes", () => {
  it("usernames are lowercase alphanumerics/underscores only", () => {
    expect(usernameSchema.safeParse("ada_okoro").success).toBe(true);
    expect(usernameSchema.safeParse("Ada Okoro").success).toBe(false);
    // 'ab' fails the min-3 rule.
    expect(usernameSchema.safeParse("ab").success).toBe(false);
  });

  it("profiles take a UUID user id and a visibility value", () => {
    const result = profileSchema.safeParse({
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "ada_okoro",
      displayName: "Ada Okoro",
      visibility: "followers",
    });
    expect(result.success).toBe(true);
    expect(communityVisibilitySchema.safeParse("hidden").success).toBe(true);
    expect(communityVisibilitySchema.safeParse("secret").success).toBe(false);
  });
});

describe("media item shape", () => {
  it("media types are image or video only", () => {
    expect(mediaItemSchema.safeParse(VALID_MEDIA_ITEM).success).toBe(true);
    expect(
      mediaItemSchema.safeParse({
        url: "https://cdn.example/x.abc",
        mediaType: "gif",
      }).success,
    ).toBe(false);
  });
});
