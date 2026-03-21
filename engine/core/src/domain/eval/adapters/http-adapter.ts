/**
 * Generic HTTP POST adapter — sends `{ message: probe }` and reads `.response`.
 * Works with any endpoint that follows a simple request/response JSON contract.
 */

import type { TargetAdapter, TargetResponse, ProbeOptions } from './adapter-port.js';

const DEFAULT_TIMEOUT = 30_000;

const sendRequest = async (
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeout: number,
): Promise<TargetResponse> => {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - start;
    const raw = await res.json() as Record<string, unknown>;
    const text = typeof raw.response === 'string'
      ? raw.response
      : typeof raw.message === 'string'
        ? raw.message
        : typeof raw.content === 'string'
          ? raw.content
          : JSON.stringify(raw);

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => { responseHeaders[k] = v; });

    return { text, status: res.status, headers: responseHeaders, latencyMs, raw };
  } finally {
    clearTimeout(timer);
  }
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
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(url, { method: 'GET', signal: controller.signal });
        return res.status < 500;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return false;
    }
  };

  return Object.freeze({ send, sendMultiTurn, checkHealth, name: 'http' });
};
