import "server-only";

/**
 * Rate-limiting integration boundary.
 *
 * SECURITY_RULES.md requires rate limits on auth, messaging, uploads, search
 * and other abuse-prone endpoints. This module defines THE BOUNDARY those
 * endpoints plug into; the in-memory fixed-window implementation below is a
 * LOCAL/TEST convenience, NOT a production control: it is per-process, not
 * shared across instances or zones, and it does not survive restarts.
 *
 * When a real rate-limiting backend (for example Redis/Upstash at the edge)
 * is approved, implement the same interface behind it and swap the adapter
 * here — nothing else in the app may touch the raw store.
 */

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
}

export interface RateLimiter {
  /** Consume one token for `key` for the limiter's configured window. */
  limit(key: string): RateLimitDecision;
}

export interface FixedWindowOptions {
  /** Maximum requests allowed per window (inclusive). */
  maxPerWindow: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Injectable clock for tests. Defaults to Date.now. */
  now?: () => number;
}

export function createInMemoryRateLimiter(
  options: FixedWindowOptions,
): RateLimiter {
  const { maxPerWindow, windowSeconds } = options;
  const now = options.now ?? (() => Date.now());
  const hits = new Map<string, { windowStart: number; count: number }>();

  return {
    limit(key: string): RateLimitDecision {
      if (maxPerWindow <= 0) {
        return { allowed: false, remaining: 0 };
      }
      const t = now();
      const windowMs = windowSeconds * 1000;
      const entry = hits.get(key);
      if (!entry || t - entry.windowStart >= windowMs) {
        hits.set(key, { windowStart: t, count: 1 });
        return { allowed: true, remaining: maxPerWindow - 1 };
      }
      if (entry.count >= maxPerWindow) {
        return { allowed: false, remaining: 0 };
      }
      entry.count += 1;
      return { allowed: true, remaining: maxPerWindow - entry.count };
    },
  };
}
