/**
 * Ollama adapter — sends to `/api/chat` format for local LLM inference.
 */

import type { TargetAdapter, TargetResponse, ProbeOptions } from './adapter-port.js';
import { safeJsonParse, withRetry } from './adapter-port.js';
import { withTimeout } from './with-timeout.js';

const DEFAULT_TIMEOUT = 120_000;
const DEFAULT_MODEL = 'llama3';

export const createOllamaAdapter = (
  baseUrl: string,
  model?: string,
): TargetAdapter => {
  const endpoint = baseUrl.replace(/\/$/, '') + '/api/chat';
  const effectiveModel = model ?? DEFAULT_MODEL;

  const send = async (probe: string, options?: ProbeOptions): Promise<TargetResponse> => {
    const start = Date.now();
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

    const messages: { role: string; content: string }[] = [];
    if (options?.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: probe });

    return withRetry(async () => withTimeout(async (signal) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: effectiveModel, messages, stream: false }),
        signal,
      });
      const latencyMs = Date.now() - start;
      const raw = await safeJsonParse(res);
      const message = raw.message as { content?: string } | undefined;
      const text = message?.content ?? '';

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { responseHeaders[k] = v; });

      return { text, status: res.status, headers: responseHeaders, latencyMs, raw };
    }, timeout));
  };

  const sendMultiTurn = async (probes: readonly string[], options?: ProbeOptions): Promise<readonly TargetResponse[]> => {
    const results: TargetResponse[] = [];
    const messages: { role: string; content: string }[] = [];
    if (options?.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });

    for (const probe of probes) {
      messages.push({ role: 'user', content: probe });
      const start = Date.now();
      const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

      const result = await withRetry(async () => withTimeout(async (signal) => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: effectiveModel, messages: [...messages], stream: false }),
          signal,
        });
        const latencyMs = Date.now() - start;
        const raw = await safeJsonParse(res);
        const message = raw.message as { content?: string } | undefined;
        const text = message?.content ?? '';

        const responseHeaders: Record<string, string> = {};
        res.headers.forEach((v, k) => { responseHeaders[k] = v; });
        return { text, status: res.status, headers: responseHeaders, latencyMs, raw };
      }, timeout));
      messages.push({ role: 'assistant', content: result.text });
      results.push(result);
    }
    return results;
  };

  const checkHealth = async (): Promise<boolean> => {
    try {
      const tagsUrl = baseUrl.replace(/\/$/, '') + '/api/tags';
      return await withTimeout(async (signal) => {
        const res = await fetch(tagsUrl, { signal });
        return res.status === 200;
      }, 5000);
    } catch {
      return false;
    }
  };

  return Object.freeze({ send, sendMultiTurn, checkHealth, name: 'ollama' });
};
