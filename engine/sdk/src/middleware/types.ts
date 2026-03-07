/**
 * US-S05-06: Shared types for HTTP middleware adapters.
 */

export interface MiddlewareOptions {
  readonly headers?: {
    readonly include?: readonly string[];
    readonly exclude?: readonly string[];
  };
}

export const DEFAULT_HEADERS: Record<string, string> = {
  'X-AI-Disclosure': 'true',
  'X-AI-Provider': 'unknown',
  'X-AI-Model': 'unknown',
  'X-Compliance-Score': '0',
};

export const HEADER_KEYS = [
  'X-AI-Disclosure',
  'X-AI-Provider',
  'X-AI-Model',
  'X-Compliance-Score',
  'X-Content-Marking',
  'X-Bias-Warning',
  'X-Bias-Score',
  'X-Human-Review',
  'X-Tool-Permission-Warning',
] as const;

/**
 * Filter headers based on include/exclude lists.
 * If include is set, only those headers pass. Exclude removes from result.
 */
export const filterHeaders = (
  headers: Record<string, string>,
  options?: MiddlewareOptions,
): Record<string, string> => {
  const entries = Object.entries(headers);
  const includeSet = options?.headers?.include ? new Set(options.headers.include) : null;
  const excludeSet = options?.headers?.exclude ? new Set(options.headers.exclude) : null;

  return Object.fromEntries(
    entries
      .filter(([k]) => !includeSet || includeSet.has(k))
      .filter(([k]) => !excludeSet || !excludeSet.has(k)),
  );
};

/**
 * Extract _complior metadata from a JSON response body string.
 * Returns compliance headers to inject.
 */
export const extractCompliorHeaders = (
  body: string,
  options?: MiddlewareOptions,
): Record<string, string> => {
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object') return {};

    const obj = parsed as Record<string, unknown>;
    const complior = obj['_complior'] as Record<string, unknown> | undefined;
    if (!complior) return {};

    const metadata = (complior['metadata'] ?? {}) as Record<string, unknown>;
    const pipelineHeaders = (complior['headers'] ?? {}) as Record<string, string>;

    const headers: Record<string, string> = { ...pipelineHeaders };

    // Inject standard headers from metadata if not already set
    if (!headers['X-AI-Disclosure']) {
      headers['X-AI-Disclosure'] = metadata['disclosureVerified'] === true ? 'verified' : 'true';
    }
    if (!headers['X-AI-Provider'] && typeof metadata['provider'] === 'string') {
      headers['X-AI-Provider'] = metadata['provider'];
    }
    const biasScore = metadata['biasScore'];
    if (!headers['X-Compliance-Score'] && typeof biasScore === 'number') {
      const score = Math.max(0, Math.round(100 - biasScore * 100));
      headers['X-Compliance-Score'] = String(score);
    }

    return filterHeaders(headers, options);
  } catch {
    return {};
  }
};
