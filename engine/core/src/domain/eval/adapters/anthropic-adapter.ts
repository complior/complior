/**
 * Anthropic-compatible adapter — sends to `/v1/messages` format.
 */

import type { TargetAdapter, TargetResponse, ProbeOptions } from './adapter-port.js';
import { safeJsonParse, withRetry } from './adapter-port.js';
import { withTimeout } from './with-timeout.js';

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export const createAnthropicAdapter = (
  baseUrl: string,
  model?: string,
  apiKey?: string,
): TargetAdapter => {
  const endpoint = baseUrl.replace(/\/$/, '') + '/v1/messages';
  const effectiveModel = model ?? DEFAULT_MODEL;

  const buildHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };
    if (apiKey) h['x-api-key'] = apiKey;
    return h;
  };

  const send = async (probe: string, options?: ProbeOptions): Promise<TargetResponse> => {
    const start = Date.now();
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

    const body: Record<string, unknown> = {
      model: effectiveModel,
      max_tokens: options?.maxTokens ?? 2048,
      messages: [{ role: 'user', content: probe }],
    };
    if (options?.systemPrompt) body.system = options.systemPrompt;
    if (options?.temperature !== undefined) body.temperature = options.temperature;

    return withRetry(async () => withTimeout(async (signal) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(body),
        signal,
      });
      const latencyMs = Date.now() - start;
      const raw = await safeJsonParse(res);

      const content = raw.content as { type?: string; text?: string }[] | undefined;
      const text = content?.find((c) => c.type === 'text')?.text ?? '';

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { responseHeaders[k] = v; });

      return { text, status: res.status, headers: responseHeaders, latencyMs, raw };
    }, timeout));
  };

  const sendMultiTurn = async (probes: readonly string[], options?: ProbeOptions): Promise<readonly TargetResponse[]> => {
    const results: TargetResponse[] = [];
    const messages: { role: string; content: string }[] = [];

    for (const probe of probes) {
      messages.push({ role: 'user', content: probe });
      const start = Date.now();
      const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

      const body: Record<string, unknown> = {
        model: effectiveModel,
        max_tokens: 2048,
        messages: [...messages],
      };
      if (options?.systemPrompt) body.system = options.systemPrompt;

      const result = await withRetry(async () => withTimeout(async (signal) => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify(body),
          signal,
        });
        const latencyMs = Date.now() - start;
        const raw = await safeJsonParse(res);
        const content = raw.content as { type?: string; text?: string }[] | undefined;
        const text = content?.find((c) => c.type === 'text')?.text ?? '';

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
      return await withTimeout(async (signal) => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({ model: effectiveModel, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
          signal,
        });
        return res.status < 500;
      }, 5000);
    } catch {
      return false;
    }
  };

  return Object.freeze({ send, sendMultiTurn, checkHealth, name: 'anthropic' });
};
