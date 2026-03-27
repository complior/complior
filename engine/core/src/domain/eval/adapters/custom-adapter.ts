/**
 * Custom template-based adapter — sends probes via configurable JSON template
 * and extracts responses via a dot-path.
 */

import type { TargetAdapter, TargetResponse, ProbeOptions } from './adapter-port.js';
import { safeJsonParse, withRetry } from './adapter-port.js';
import { withTimeout, extractResponseHeaders } from './with-timeout.js';

const DEFAULT_TIMEOUT = 30_000;

/** Resolve a dot-separated path on an object (e.g. "data.choices.0.text"). */
const resolvePath = (obj: unknown, path: string): unknown => {
  let current = obj;
  for (const key of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

export const createCustomAdapter = (
  url: string,
  template: Record<string, unknown>,
  responsePath: string,
  headers?: Record<string, string>,
): TargetAdapter => {

  const send = async (probe: string, options?: ProbeOptions): Promise<TargetResponse> => {
    const start = Date.now();
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

    // Replace {{probe}} placeholder in template
    const body = JSON.parse(
      JSON.stringify(template).replace(/\{\{probe\}\}/g, probe.replace(/"/g, '\\"')),
    );

    return withRetry(async () => withTimeout(async (signal) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal,
      });
      const latencyMs = Date.now() - start;
      const raw = await safeJsonParse(res);
      const resolved = resolvePath(raw, responsePath);
      const text = typeof resolved === 'string' ? resolved : JSON.stringify(resolved ?? '');

      return { text, status: res.status, headers: extractResponseHeaders(res), latencyMs, raw };
    }, timeout));
  };

  const sendMultiTurn = async (probes: readonly string[], options?: ProbeOptions): Promise<readonly TargetResponse[]> => {
    const results: TargetResponse[] = [];
    for (const probe of probes) {
      results.push(await send(probe, options));
    }
    return results;
  };

  const checkHealth = async (): Promise<boolean> => {
    try {
      return await withTimeout(async (signal) => {
        const res = await fetch(url, { method: 'GET', signal });
        return res.status < 500;
      }, 5000);
    } catch {
      return false;
    }
  };

  return Object.freeze({ send, sendMultiTurn, checkHealth, name: 'custom' });
};
