/**
 * Auto-detect adapter — probes the target URL to determine which adapter to use.
 *
 * Detection order:
 *   1. URL protocol hint (openai://, anthropic://, ollama://)
 *   2. /v1/models → OpenAI-compatible
 *   3. /api/tags → Ollama
 *   4. Fallback → Generic HTTP
 */

import type { TargetAdapter } from './adapter-port.js';
import { createHttpAdapter } from './http-adapter.js';
import { createOpenAIAdapter } from './openai-adapter.js';
import { createAnthropicAdapter } from './anthropic-adapter.js';
import { createOllamaAdapter } from './ollama-adapter.js';

/** Parse protocol-hinted URLs like openai://localhost:4000 → http://localhost:4000 */
const parseProtocolHint = (url: string): { protocol: string; httpUrl: string } | null => {
  const match = url.match(/^(openai|anthropic|ollama):\/\/(.+)/);
  if (!match) return null;
  const protocol = match[1]!;
  const rest = match[2]!;
  const httpUrl = rest.startsWith('http') ? rest : `http://${rest}`;
  return { protocol, httpUrl };
};

const tryFetch = async (url: string, timeout = 3000): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal });
      return res.status === 200;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
};

export const autoDetectAdapter = async (
  url: string,
  model?: string,
  apiKey?: string,
): Promise<TargetAdapter> => {
  // 1. Check protocol hints
  const hint = parseProtocolHint(url);
  if (hint) {
    switch (hint.protocol) {
      case 'openai':    return createOpenAIAdapter(hint.httpUrl, model, apiKey);
      case 'anthropic': return createAnthropicAdapter(hint.httpUrl, model, apiKey);
      case 'ollama':    return createOllamaAdapter(hint.httpUrl, model);
    }
  }

  const baseUrl = url.replace(/\/$/, '');

  // 2. Probe /v1/models (OpenAI-compatible)
  if (await tryFetch(`${baseUrl}/v1/models`)) {
    return createOpenAIAdapter(baseUrl, model, apiKey);
  }

  // 3. Probe /api/tags (Ollama)
  if (await tryFetch(`${baseUrl}/api/tags`)) {
    return createOllamaAdapter(baseUrl, model);
  }

  // 4. Fallback to generic HTTP
  return createHttpAdapter(url);
};
