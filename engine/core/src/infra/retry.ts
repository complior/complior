/**
 * Retry utility for fire-and-forget operations (scan persist, bundle fetch).
 * Standalone version — no SDK dependency.
 */

const RETRYABLE_ERROR_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'EAI_AGAIN']);

export interface RetryConfig {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
}

const isRetryable = (error: unknown): boolean => {
  if (error && typeof error === 'object') {
    const code = (error as Record<string, unknown>).code;
    if (typeof code === 'string' && RETRYABLE_ERROR_CODES.has(code)) return true;
    const syscall = (error as Record<string, unknown>).syscall;
    if (typeof syscall === 'string') return true; // filesystem errors
  }
  return false;
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  config?: RetryConfig,
): Promise<T> => {
  const maxRetries = config?.maxRetries ?? 2;
  const baseDelayMs = config?.baseDelayMs ?? 500;
  const maxDelayMs = config?.maxDelayMs ?? 5000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !isRetryable(error)) {
        throw error;
      }
      const jitter = Math.random() * baseDelayMs * 0.5;
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt) + jitter, maxDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('withRetry: unexpected exit');
};
