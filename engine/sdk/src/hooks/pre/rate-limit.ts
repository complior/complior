import type { PreHook } from '../../types.js';
import { RateLimitError } from '../../errors.js';

/** C.R12: Sliding window rate limiter based on passport constraints */
export const createRateLimitHook = (maxPerMinute: number): PreHook => {
  let timestamps: number[] = [];

  return (ctx) => {
    const now = Date.now();
    const windowStart = now - 60_000;

    // Remove expired timestamps (immutable filter instead of mutable shift)
    timestamps = timestamps.filter((t) => t >= windowStart);

    if (timestamps.length >= maxPerMinute) {
      throw new RateLimitError(
        `Rate limit exceeded: ${maxPerMinute} calls/minute`,
        maxPerMinute,
      );
    }

    timestamps.push(now);
    return ctx;
  };
};
