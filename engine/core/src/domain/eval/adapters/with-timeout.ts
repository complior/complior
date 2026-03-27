/**
 * Shared utilities for eval adapters.
 * Replaces repeated boilerplate across adapter implementations.
 */

/** Run an async operation with an AbortSignal that fires after timeoutMs. */
export const withTimeout = async <T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
};

/** Extract all response headers into a plain record. */
export const extractResponseHeaders = (res: Response): Record<string, string> => {
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => { headers[k] = v; });
  return headers;
};
