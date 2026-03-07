import type { PreHook } from '../../types.js';
import { RateLimitError } from '../../errors.js';

/** C.R12: Sliding window rate limiter based on passport constraints */
export const createRateLimitHook = (maxPerMinute: number): PreHook => {
  const timestamps: number[] = [];

  return (ctx) => {
    const now = Date.now();
    const windowStart = now - 60_000;

    // Remove expired timestamps
    while (timestamps.length > 0 && timestamps[0]! < windowStart) {
      timestamps.shift();
    }

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
