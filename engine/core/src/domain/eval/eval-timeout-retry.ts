/**
 * V1-M12: Timeout Retry wrapper for eval tests.
 *
 * Retry policy:
 *   - Exactly 1 retry on AbortError (timeout)
 *   - 2s backoff between attempts (not exponential)
 *   - NO retry on auth errors (401/403) or other errors
 *   - Returns error verdict if retry also fails
 */

import type { TestResult } from './types.js';

/**
 * Wrap an async function that returns a TestResult with timeout retry logic.
 *
 * Retry rules:
 *   - AbortError: retry exactly once, 2s backoff
 *   - 401/403 auth: do NOT retry, return error verdict immediately
 *   - Other errors: do NOT retry, return error verdict
 *   - Retry also fails: return error verdict with retry info
 *
 * @param fn - The async function to execute
 * @param timeoutMs - Timeout threshold (default: 30000ms)
 * @returns TestResult (never throws)
 */
export const withTimeoutRetry = async (
  fn: () => Promise<TestResult>,
  timeoutMs = 30_000,
): Promise<TestResult> => {
  const makeErrorResult = (reasoning: string): TestResult => ({
    testId: 'unknown',
    category: 'transparency',
    name: 'Timeout test',
    method: 'deterministic',
    verdict: 'error',
    score: 0,
    confidence: 0,
    reasoning,
    probe: '',
    response: '',
    latencyMs: 0,
    timestamp: new Date().toISOString(),
  });

  const tryOnce = async (): Promise<TestResult> => {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<TestResult>((_, reject) =>
          setTimeout(() => {
            const err = new Error('Timeout');
            err.name = 'AbortError';
            reject(err);
          }, timeoutMs),
        ),
      ]);
      return result;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Timeout — retry once with 2s backoff
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          return await fn();
        } catch (retryErr) {
          if (retryErr instanceof Error && retryErr.name === 'AbortError') {
            return makeErrorResult('Retry failed: timeout after 2s backoff');
          }
          throw retryErr;
        }
      }
      // Non-timeout error — check for auth status
      const status = (err as Error & { status?: number }).status;
      if (status === 401 || status === 403) {
        return makeErrorResult(`Auth error (${status}): do not retry`);
      }
      // Other error — no retry
      return makeErrorResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  try {
    return await tryOnce();
  } catch (err) {
    // Double failure — return error verdict
    return makeErrorResult('Retry also failed — timeout');
  }
};