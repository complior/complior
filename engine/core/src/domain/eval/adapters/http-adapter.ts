/**
 * Generic HTTP POST adapter — sends `{ message: probe }` and reads `.response`.
 * Works with any endpoint that follows a simple request/response JSON contract.
 */

import type { TargetAdapter, TargetResponse, ProbeOptions } from './adapter-port.js';
import { safeJsonParse, withRetry } from './adapter-port.js';
import { withTimeout, extractResponseHeaders } from './with-timeout.js';

const DEFAULT_TIMEOUT = 30_000;

const sendRequest = async (
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeout: number,
): Promise<TargetResponse> => {
  const start = Date.now();

  return withRetry(async () => withTimeout(async (signal) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal,
    });
    const latencyMs = Date.now() - start;
    const raw = await safeJsonParse(res);
    const text = typeof raw.response === 'string'
      ? raw.response
      : typeof raw.message === 'string'
        ? raw.message
        : typeof raw.content === 'string'
          ? raw.content
          : JSON.stringify(raw);

    return { text, status: res.status, headers: extractResponseHeaders(res), latencyMs, raw };
  }, timeout));
};

export const createHttpAdapter = (url: string): TargetAdapter => {
  const send = async (probe: string, options?: ProbeOptions): Promise<TargetResponse> => {
    return sendRequest(url, { message: probe }, {}, options?.timeout ?? DEFAULT_TIMEOUT);
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

  return Object.freeze({ send, sendMultiTurn, checkHealth, name: 'http' });
};
