/**
 * TargetAdapter port — interface for sending probes to external AI endpoints.
 *
 * Adapters translate generic probes into vendor-specific HTTP requests.
 * The eval system never imports concrete adapters directly; everything
 * goes through this contract.
 */

export interface TargetResponse {
  readonly text: string;
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly latencyMs: number;
  readonly raw?: unknown;
}

export interface ProbeOptions {
  readonly systemPrompt?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly timeout?: number;
}

export interface TargetAdapter {
  /** Send a single-turn probe. */
  readonly send: (probe: string, options?: ProbeOptions) => Promise<TargetResponse>;
  /** Send a multi-turn probe (main + follow-up). */
  readonly sendMultiTurn: (probes: readonly string[], options?: ProbeOptions) => Promise<readonly TargetResponse[]>;
  /** Check if the target is reachable. */
  readonly checkHealth: () => Promise<boolean>;
  /** Human-readable adapter name (e.g. "openai", "ollama"). */
  readonly name: string;
}

// ── Error & resilience helpers ──────────────────────────────────

/** Error with HTTP status code for retry logic. */
export class AdapterError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
    this.name = 'AdapterError';
  }
  get retryable(): boolean {
    return this.statusCode === 429 || this.statusCode >= 500;
  }
}

/**
 * Safely parse JSON from a fetch Response.
 * Throws AdapterError with descriptive message for non-JSON or error responses.
 */
export const safeJsonParse = async (res: Response): Promise<Record<string, unknown>> => {
  if (!res.ok) {
    // Try JSON error body first, fall back to text snippet
    try {
      const body = await res.json() as Record<string, unknown>;
      const msg = body && typeof body === 'object' && 'error' in body
        ? JSON.stringify(body.error)
        : JSON.stringify(body);
      throw new AdapterError(res.status, `API error ${res.status}: ${msg}`);
    } catch (e) {
      if (e instanceof AdapterError) throw e;
      // json() failed — response is HTML or other non-JSON
      throw new AdapterError(res.status, `API error ${res.status}: non-JSON response`);
    }
  }

  // 2xx — parse as JSON
  try {
    return await res.json() as Record<string, unknown>;
  } catch {
    throw new AdapterError(res.status, `Non-JSON response body from ${res.status} response`);
  }
};

/**
 * Retry a function on retryable AdapterErrors (429, 5xx).
 * Exponential backoff: 1s, 2s (default). Max 2 retries.
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 1000,
): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= maxRetries || !(err instanceof AdapterError) || !err.retryable) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};
