import type { PostHook, MiddlewareContext } from '../../types.js';
import { CircuitBreakerError } from '../../errors.js';

// --- Config ---

export interface CircuitBreakerConfig {
  /** Number of consecutive errors to trigger open state (default: 5) */
  readonly errorThreshold?: number;
  /** Sliding window for error counting in ms (default: 60_000) */
  readonly windowMs?: number;
  /** Cooldown before half-open probe in ms (default: 30_000) */
  readonly cooldownMs?: number;
  /** Callback on state transitions */
  readonly onTrip?: (state: 'open' | 'half-open' | 'closed') => void;
}

// --- State ---

type CircuitState = 'closed' | 'open' | 'half-open';

interface ErrorRecord {
  readonly timestamp: number;
}

// --- Factory ---

/** C.R14: Circuit breaker — suspend agent on anomaly, Art.14(4)(b) */
export const createCircuitBreakerHook = (config: CircuitBreakerConfig = {}): PostHook => {
  const errorThreshold = config.errorThreshold ?? 5;
  const windowMs = config.windowMs ?? 60_000;
  const cooldownMs = config.cooldownMs ?? 30_000;

  let state: CircuitState = 'closed';
  let errors: ErrorRecord[] = [];
  let openedAt = 0;

  const transition = (next: CircuitState): void => {
    if (state !== next) {
      state = next;
      config.onTrip?.(next);
    }
  };

  const pruneOldErrors = (now: number): void => {
    errors = errors.filter((e) => now - e.timestamp < windowMs);
  };

  const isErrorResponse = (response: unknown): boolean => {
    if (response === null || response === undefined) return true;
    if (typeof response === 'object' && 'error' in response && response.error !== undefined) return true;
    return false;
  };

  return (ctx: MiddlewareContext, response: unknown) => {
    const now = Date.now();

    // If open, check if cooldown elapsed for half-open
    if (state === 'open') {
      if (now - openedAt >= cooldownMs) {
        transition('half-open');
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker OPEN: agent suspended after ${errorThreshold} consecutive errors`,
          state,
          errorThreshold,
        );
      }
    }

    // Detect error in response
    const hasError = isErrorResponse(response);

    if (hasError) {
      errors.push({ timestamp: now });
      pruneOldErrors(now);

      if (state === 'half-open') {
        // Probe failed — reopen
        openedAt = now;
        transition('open');
        throw new CircuitBreakerError(
          `Circuit breaker re-opened: probe call failed`,
          state,
          errorThreshold,
        );
      }

      if (errors.length >= errorThreshold) {
        openedAt = now;
        transition('open');
        throw new CircuitBreakerError(
          `Circuit breaker tripped: ${errors.length} errors in ${windowMs}ms window`,
          state,
          errorThreshold,
        );
      }
    } else {
      // Success
      if (state === 'half-open') {
        errors = [];
        transition('closed');
      }
    }

    return {
      response,
      metadata: {
        ...ctx.metadata,
        circuitBreaker: { state, errorCount: errors.length },
      },
      headers: {},
    };
  };
};
