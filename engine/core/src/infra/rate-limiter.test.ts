import { describe, it, expect } from 'vitest';
import { createRateLimiter } from './rate-limiter.js';

describe('createRateLimiter', () => {
  it('allows requests under the limit', () => {
    const limiter = createRateLimiter(3);
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(true);
  });

  it('blocks requests over the limit', () => {
    const limiter = createRateLimiter(2);
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(false);
  });

  it('reports remaining correctly', () => {
    const limiter = createRateLimiter(3);
    expect(limiter.remaining()).toBe(3);
    limiter.check();
    expect(limiter.remaining()).toBe(2);
    limiter.check();
    expect(limiter.remaining()).toBe(1);
    limiter.check();
    expect(limiter.remaining()).toBe(0);
  });

  it('uses custom window duration', () => {
    // 50ms window — requests expire quickly
    const limiter = createRateLimiter(1, 50);
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(false);
  });
});
