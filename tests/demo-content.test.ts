import { describe, expect, it } from "vitest";

import {
  DEMO_AUTHORS,
  DEMO_COMMUNITIES,
  DEMO_LISTINGS,
  DEMO_POSTS,
  DEMO_VIDEOS,
  formatCount,
  getAuthor,
} from "@/lib/demo-content";

const CORPUS = JSON.stringify({
  DEMO_AUTHORS,
  DEMO_COMMUNITIES,
  DEMO_LISTINGS,
  DEMO_POSTS,
  DEMO_VIDEOS,
});

describe("demonstration content invariants", () => {
  it("references only known demo authors", () => {
    for (const post of DEMO_POSTS) {
      expect(getAuthor(post.authorHandle)).toBeTruthy();
    }
    for (const video of DEMO_VIDEOS) {
      expect(getAuthor(video.authorHandle)).toBeTruthy();
    }
    for (const listing of DEMO_LISTINGS) {
      expect(getAuthor(listing.providerHandle)).toBeTruthy();
    }
  });

  it("contains no contact details or external links", () => {
    expect(CORPUS).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(CORPUS).not.toMatch(/\+?\d[\d\s-]{8,}\d/);
    expect(CORPUS).not.toMatch(/https?:\/\//);
  });

  it("uses only the supported community visibility values", () => {
    for (const community of DEMO_COMMUNITIES) {
      expect(["public", "private"]).toContain(community.visibility);
    }
  });

  it("formats compact counts", () => {
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1284)).toBe("1.3k");
    expect(formatCount(12400)).toBe("12k");
  });
});
