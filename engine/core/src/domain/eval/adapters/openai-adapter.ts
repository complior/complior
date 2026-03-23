/**
 * OpenAI-compatible adapter — sends to `/v1/chat/completions` format.
 * Works with OpenAI, Azure OpenAI, vLLM, LM Studio, and any OpenAI-compatible API.
 */

import type { TargetAdapter, TargetResponse, ProbeOptions } from './adapter-port.js';
import { safeJsonParse, withRetry } from './adapter-port.js';

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MODEL = 'gpt-4o';

export const createOpenAIAdapter = (
  baseUrl: string,
  model?: string,
  apiKey?: string,
): TargetAdapter => {
  const endpoint = baseUrl.replace(/\/$/, '') + '/v1/chat/completions';
  const effectiveModel = model ?? DEFAULT_MODEL;

  const buildHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
    return h;
  };

  const send = async (probe: string, options?: ProbeOptions): Promise<TargetResponse> => {
    const start = Date.now();
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

    const messages: { role: string; content: string }[] = [];
    if (options?.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: probe });

    return withRetry(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({
            model: effectiveModel,
            messages,
            temperature: options?.temperature ?? 0,
            max_tokens: options?.maxTokens ?? 2048,
          }),
          signal: controller.signal,
        });
        const latencyMs = Date.now() - start;
        const raw = await safeJsonParse(res);

        const choices = raw.choices as { message?: { content?: string } }[] | undefined;
        const text = choices?.[0]?.message?.content ?? '';

        const responseHeaders: Record<string, string> = {};
        res.headers.forEach((v, k) => { responseHeaders[k] = v; });

        return { text, status: res.status, headers: responseHeaders, latencyMs, raw };
      } finally {
        clearTimeout(timer);
      }
    });
  };

  const sendMultiTurn = async (probes: readonly string[], options?: ProbeOptions): Promise<readonly TargetResponse[]> => {
    const results: TargetResponse[] = [];
    const messages: { role: string; content: string }[] = [];
    if (options?.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });

    for (const probe of probes) {
      messages.push({ role: 'user', content: probe });
      const start = Date.now();
      const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

      const result = await withRetry(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ model: effectiveModel, messages, temperature: 0, max_tokens: 2048 }),
            signal: controller.signal,
          });
          const latencyMs = Date.now() - start;
          const raw = await safeJsonParse(res);
          const choices = raw.choices as { message?: { content?: string } }[] | undefined;
          const text = choices?.[0]?.message?.content ?? '';

          const responseHeaders: Record<string, string> = {};
          res.headers.forEach((v, k) => { responseHeaders[k] = v; });
          return { text, status: res.status, headers: responseHeaders, latencyMs, raw };
        } finally {
          clearTimeout(timer);
        }
      });
      messages.push({ role: 'assistant', content: result.text });
      results.push(result);
    }
    return results;
  };

  const checkHealth = async (): Promise<boolean> => {
    try {
      const modelsUrl = baseUrl.replace(/\/$/, '') + '/v1/models';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(modelsUrl, { headers: buildHeaders(), signal: controller.signal });
        return res.status === 200;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return false;
    }
  };

  return Object.freeze({ send, sendMultiTurn, checkHealth, name: 'openai' });
};
