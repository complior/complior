import type { RetryConfig } from '../types.js';
import { MiddlewareError } from '../errors.js';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'EAI_AGAIN']);

export const isRetryable = (error: unknown): boolean => {
  if (error instanceof MiddlewareError) return false;

  if (error && typeof error === 'object') {
    const status = (error as Record<string, unknown>).status;
    if (typeof status === 'number' && RETRYABLE_STATUS_CODES.has(status)) return true;

    const code = (error as Record<string, unknown>).code;
    if (typeof code === 'string' && RETRYABLE_ERROR_CODES.has(code)) return true;
  }

  return false;
};

const DEFAULT_RETRY: Required<RetryConfig> = {
  enabled: true,
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  config?: RetryConfig,
): Promise<T> => {
  const opts = { ...DEFAULT_RETRY, ...config };
  if (!opts.enabled) return fn();

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === opts.maxRetries || !isRetryable(error)) {
        throw error;
      }
      const jitter = Math.random() * opts.baseDelayMs * 0.5;
      const delay = Math.min(opts.baseDelayMs * Math.pow(2, attempt) + jitter, opts.maxDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Unreachable — loop always returns or throws
  throw new Error('withRetry: unexpected exit');
};
