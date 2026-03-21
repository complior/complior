/**
 * Ollama adapter — sends to `/api/chat` format for local LLM inference.
 */

import type { TargetAdapter, TargetResponse, ProbeOptions } from './adapter-port.js';

const DEFAULT_TIMEOUT = 60_000;
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const messages: { role: string; content: string }[] = [];
    if (options?.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: probe });

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: effectiveModel, messages, stream: false }),
        signal: controller.signal,
      });
      const latencyMs = Date.now() - start;
      const raw = await res.json() as Record<string, unknown>;
      const message = raw.message as { content?: string } | undefined;
      const text = message?.content ?? '';

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
    if (options?.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });

    for (const probe of probes) {
      messages.push({ role: 'user', content: probe });
      const start = Date.now();
      const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: effectiveModel, messages: [...messages], stream: false }),
          signal: controller.signal,
        });
        const latencyMs = Date.now() - start;
        const raw = await res.json() as Record<string, unknown>;
        const message = raw.message as { content?: string } | undefined;
        const text = message?.content ?? '';
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
      const tagsUrl = baseUrl.replace(/\/$/, '') + '/api/tags';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(tagsUrl, { signal: controller.signal });
        return res.status === 200;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return false;
    }
  };

  return Object.freeze({ send, sendMultiTurn, checkHealth, name: 'ollama' });
};
