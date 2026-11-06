import { describe, expect, it } from "vitest";

import { createInMemoryRateLimiter } from "@/server/ratelimit";

/**
 * Rate-limit boundary tests. The in-memory fixed-window limiter is a
 * LOCAL/TEST control only (server/ratelimit.ts documents this); these tests
 * pin the boundary's behaviour so a future remote limiter can be swapped in
 * behind the same interface.
 */
describe("in-memory fixed-window rate limiter", () => {
  it("allows requests up to the window maximum, then denies", () => {
    let t = 0;
    const limiter = createInMemoryRateLimiter({
      maxPerWindow: 3,
      windowSeconds: 60,
      now: () => t,
    });
    expect(limiter.limit("peer:1.2.3.4").allowed).toBe(true);
    expect(limiter.limit("peer:1.2.3.4").allowed).toBe(true);
    expect(limiter.limit("peer:1.2.3.4").allowed).toBe(true);
    const denied = limiter.limit("peer:1.2.3.4");
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
  });

  it("resets at the next window so services recover", () => {
    let t = 0;
    const limiter = createInMemoryRateLimiter({
      maxPerWindow: 1,
      windowSeconds: 60,
      now: () => t,
    });
    expect(limiter.limit("user:abc").allowed).toBe(true);
    expect(limiter.limit("user:abc").allowed).toBe(false);
    t = 61_000; // next window
    expect(limiter.limit("user:abc").allowed).toBe(true);
  });

  it("keys are isolated from each other", () => {
    const limiter = createInMemoryRateLimiter({
      maxPerWindow: 1,
      windowSeconds: 60,
      now: () => 0,
    });
    expect(limiter.limit("user:a").allowed).toBe(true);
    expect(limiter.limit("user:b").allowed).toBe(true);
    expect(limiter.limit("user:a").allowed).toBe(false);
    expect(limiter.limit("user:b").allowed).toBe(false);
  });

  it("a zero maximum denies everything (safe default for misconfiguration)", () => {
    const limiter = createInMemoryRateLimiter({
      maxPerWindow: 0,
      windowSeconds: 60,
      now: () => 0,
    });
    expect(limiter.limit("user:any").allowed).toBe(false);
  });
});
