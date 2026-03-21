/**
 * Anthropic-compatible adapter — sends to `/v1/messages` format.
 */

import type { TargetAdapter, TargetResponse, ProbeOptions } from './adapter-port.js';

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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const body: Record<string, unknown> = {
      model: effectiveModel,
      max_tokens: options?.maxTokens ?? 2048,
      messages: [{ role: 'user', content: probe }],
    };
    if (options?.systemPrompt) body.system = options.systemPrompt;
    if (options?.temperature !== undefined) body.temperature = options.temperature;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const latencyMs = Date.now() - start;
      const raw = await res.json() as Record<string, unknown>;

      // Extract text from Anthropic response format
      const content = raw.content as { type?: string; text?: string }[] | undefined;
      const text = content?.find((c) => c.type === 'text')?.text ?? '';

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { responseHeaders[k] = v; });

      return { text, status: res.status, headers: responseHeaders, latencyMs, raw };
    } finally {
      clearTimeout(timer);
    }
  };

  const sendMultiTurn = async (probes: readonly string[], options?: ProbeOptions): Promise<readonly TargetResponse[]> => {
    const results: TargetResponse[] = [];
    const messages: { role: string; content: string }[] = [];

    for (const probe of probes) {
      messages.push({ role: 'user', content: probe });
      const start = Date.now();
      const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const body: Record<string, unknown> = {
        model: effectiveModel,
        max_tokens: 2048,
        messages: [...messages],
      };
      if (options?.systemPrompt) body.system = options.systemPrompt;

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        const latencyMs = Date.now() - start;
        const raw = await res.json() as Record<string, unknown>;
        const content = raw.content as { type?: string; text?: string }[] | undefined;
        const text = content?.find((c) => c.type === 'text')?.text ?? '';
        messages.push({ role: 'assistant', content: text });

        const responseHeaders: Record<string, string> = {};
        res.headers.forEach((v, k) => { responseHeaders[k] = v; });
        results.push({ text, status: res.status, headers: responseHeaders, latencyMs, raw });
      } finally {
        clearTimeout(timer);
      }
    }
    return results;
  };

  const checkHealth = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({ model: effectiveModel, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
          signal: controller.signal,
        });
        return res.status < 500;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return false;
    }
  };

  return Object.freeze({ send, sendMultiTurn, checkHealth, name: 'anthropic' });
};
