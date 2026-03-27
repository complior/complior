/**
 * Timeout utility for fetch operations.
 * Replaces repeated AbortController + setTimeout + clearTimeout boilerplate.
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
