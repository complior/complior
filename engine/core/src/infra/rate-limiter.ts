/**
 * Sliding-window rate limiter — shared utility for per-hour request throttling.
 *
 * Used by chat route (50 req/hour default). Configurable window and limit.
 */

const DEFAULT_WINDOW_MS = 3_600_000; // 1 hour

export const createRateLimiter = (
  maxRequests: number,
  windowMs: number = DEFAULT_WINDOW_MS,
) => {
  let timestamps: number[] = [];

  /** Returns true if the request is allowed, false if rate-limited. */
  const check = (): boolean => {
    const cutoff = Date.now() - windowMs;
    timestamps = timestamps.filter(t => t > cutoff);
    if (timestamps.length >= maxRequests) return false;
    timestamps.push(Date.now());
    return true;
  };

  /** Number of remaining requests in current window. */
  const remaining = (): number => {
    const cutoff = Date.now() - windowMs;
    timestamps = timestamps.filter(t => t > cutoff);
    return Math.max(0, maxRequests - timestamps.length);
  };

  return Object.freeze({ check, remaining });
};

export type RateLimiter = ReturnType<typeof createRateLimiter>;
