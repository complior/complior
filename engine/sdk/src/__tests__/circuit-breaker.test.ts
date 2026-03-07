import { describe, it, expect, vi } from 'vitest';
import { createCircuitBreakerHook } from '../hooks/post/circuit-breaker.js';
import { CircuitBreakerError } from '../errors.js';
import type { MiddlewareContext } from '../types.js';

const makeCtx = (): MiddlewareContext => ({
  provider: 'openai',
  method: 'create',
  config: {},
  params: {},
  metadata: {},
});

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('createCircuitBreakerHook', () => {
  describe('closed → open transition', () => {
    it('stays closed on successful responses', () => {
      const hook = createCircuitBreakerHook({ errorThreshold: 3 });
      const ctx = makeCtx();

      const result = hook(ctx, { data: 'ok' });
      expect(result.metadata['circuitBreaker']).toEqual({ state: 'closed', errorCount: 0 });
    });

    it('counts errors and trips after threshold', () => {
      const onTrip = vi.fn();
      const hook = createCircuitBreakerHook({ errorThreshold: 3, onTrip });
      const ctx = makeCtx();

      // 2 errors — still closed
      hook(ctx, { error: 'fail' });
      const r2 = hook(ctx, { error: 'fail' });
      expect(r2.metadata['circuitBreaker']).toEqual({ state: 'closed', errorCount: 2 });

      // 3rd error — trips open
      expect(() => hook(ctx, { error: 'fail' })).toThrow(CircuitBreakerError);
      expect(onTrip).toHaveBeenCalledWith('open');
    });

    it('treats null response as error', () => {
      const hook = createCircuitBreakerHook({ errorThreshold: 1 });
      const ctx = makeCtx();

      expect(() => hook(ctx, null)).toThrow(CircuitBreakerError);
    });
  });

  describe('open state blocks calls', () => {
    it('throws CircuitBreakerError while open', () => {
      const hook = createCircuitBreakerHook({ errorThreshold: 1, cooldownMs: 60_000 });
      const ctx = makeCtx();

      // Trip the breaker
      expect(() => hook(ctx, null)).toThrow(CircuitBreakerError);

      // Subsequent call still blocked (cooldown not elapsed)
      expect(() => hook(ctx, { data: 'ok' })).toThrow(CircuitBreakerError);
    });
  });

  describe('cooldown → half-open → closed recovery', () => {
    it('transitions to half-open after cooldown and recovers on success', async () => {
      const onTrip = vi.fn();
      const hook = createCircuitBreakerHook({
        errorThreshold: 1,
        cooldownMs: 10,
        onTrip,
      });
      const ctx = makeCtx();

      // Trip the breaker
      expect(() => hook(ctx, null)).toThrow(CircuitBreakerError);
      expect(onTrip).toHaveBeenCalledWith('open');

      // Wait for cooldown
      await delay(15);

      // Probe call succeeds → should recover to closed
      const result = hook(ctx, { data: 'ok' });
      expect(onTrip).toHaveBeenCalledWith('half-open');
      expect(onTrip).toHaveBeenCalledWith('closed');
      expect(result.metadata['circuitBreaker']).toEqual({ state: 'closed', errorCount: 0 });
    });

    it('re-opens if probe call fails', async () => {
      const onTrip = vi.fn();
      const hook = createCircuitBreakerHook({
        errorThreshold: 1,
        cooldownMs: 10,
        onTrip,
      });
      const ctx = makeCtx();

      // Trip
      expect(() => hook(ctx, null)).toThrow(CircuitBreakerError);

      // Wait for cooldown
      await delay(15);

      // Probe fails — re-opens
      expect(() => hook(ctx, { error: 'still failing' })).toThrow(CircuitBreakerError);
      // Should have: open, half-open, open
      expect(onTrip).toHaveBeenCalledTimes(3);
    });
  });

  describe('sliding window', () => {
    it('prunes errors outside the window', async () => {
      const hook = createCircuitBreakerHook({
        errorThreshold: 3,
        windowMs: 10,
      });
      const ctx = makeCtx();

      // 2 errors
      hook(ctx, { error: 'fail' });
      hook(ctx, { error: 'fail' });

      // Wait for window to expire
      await delay(15);

      // This error should not trip (old errors pruned)
      const result = hook(ctx, { error: 'fail' });
      expect(result.metadata['circuitBreaker']).toEqual({ state: 'closed', errorCount: 1 });
    });
  });

  describe('onTrip callback', () => {
    it('calls onTrip on each state transition', () => {
      const transitions: string[] = [];
      const hook = createCircuitBreakerHook({
        errorThreshold: 1,
        cooldownMs: 10,
        onTrip: (s) => transitions.push(s),
      });
      const ctx = makeCtx();

      // closed → open
      expect(() => hook(ctx, null)).toThrow(CircuitBreakerError);
      expect(transitions).toEqual(['open']);
    });
  });
});
