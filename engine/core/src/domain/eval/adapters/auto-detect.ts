/**
 * Auto-detect adapter — probes the target URL to determine which adapter to use.
 *
 * Detection order:
 *   1. Custom adapter (if requestTemplate + responsePath provided)
 *   2. URL protocol hint (openai://, anthropic://, ollama://)
 *   3. /v1/models → OpenAI-compatible
 *   4. /api/tags → Ollama
 *   5. URL path contains /v1/chat/completions → OpenAI-compatible
 *   6. POST /v1/chat/completions with minimal payload → OpenAI-compatible
 *   7. Fallback → Generic HTTP
 */

import type { TargetAdapter } from './adapter-port.js';
import { withTimeout } from './with-timeout.js';
import { createHttpAdapter } from './http-adapter.js';
import { createOpenAIAdapter } from './openai-adapter.js';
import { createAnthropicAdapter } from './anthropic-adapter.js';
import { createOllamaAdapter } from './ollama-adapter.js';
import { createCustomAdapter } from './custom-adapter.js';

export interface AutoDetectOptions {
  readonly model?: string;
  readonly apiKey?: string;
  readonly requestTemplate?: string;
  readonly responsePath?: string;
  readonly headers?: string;
}

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
    return await withTimeout(async (signal) => {
      const res = await fetch(url, { signal });
      return res.status === 200;
    }, timeout);
  } catch {
    return false;
  }
};

/** Try POST to /v1/chat/completions with minimal OpenAI payload. Returns true if 2xx. */
const tryOpenAIPost = async (
  baseUrl: string,
  model?: string,
  key?: string,
  timeout = 3000,
): Promise<boolean> => {
  try {
    return await withTimeout(async (signal) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (key) headers['Authorization'] = `Bearer ${key}`;
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model ?? 'gpt-4o',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
        signal,
      });
      return res.ok;
    }, timeout);
  } catch {
    return false;
  }
};

export const autoDetectAdapter = async (
  url: string,
  modelOrOpts?: string | AutoDetectOptions,
  apiKey?: string,
): Promise<TargetAdapter> => {
  // Normalize overloaded params
  const opts: AutoDetectOptions = typeof modelOrOpts === 'string'
    ? { model: modelOrOpts, apiKey }
    : modelOrOpts ?? {};
  const model = opts.model;
  const key = opts.apiKey ?? apiKey;

  // 0. Custom adapter (explicit template)
  if (opts.requestTemplate && opts.responsePath) {
    let template: Record<string, unknown>;
    try {
      template = JSON.parse(opts.requestTemplate);
    } catch {
      throw new Error(`Invalid --request-template JSON: ${opts.requestTemplate}`);
    }
    let customHeaders: Record<string, string> | undefined;
    if (opts.headers) {
      try {
        customHeaders = JSON.parse(opts.headers);
      } catch {
        throw new Error(`Invalid --headers JSON: ${opts.headers}`);
      }
    }
    return createCustomAdapter(url, template, opts.responsePath, customHeaders);
  }

  // 1. Check protocol hints
  const hint = parseProtocolHint(url);
  if (hint) {
    switch (hint.protocol) {
      case 'openai':    return createOpenAIAdapter(hint.httpUrl, model, key);
      case 'anthropic': return createAnthropicAdapter(hint.httpUrl, model, key);
      case 'ollama':    return createOllamaAdapter(hint.httpUrl, model);
    }
  }

  const baseUrl = url.replace(/\/$/, '');

  // 2. Probe /v1/models (OpenAI-compatible)
  if (await tryFetch(`${baseUrl}/v1/models`)) {
    return createOpenAIAdapter(baseUrl, model, key);
  }

  // 3. Probe /api/tags (Ollama)
  if (await tryFetch(`${baseUrl}/api/tags`)) {
    return createOllamaAdapter(baseUrl, model);
  }

  // 4. URL path heuristic — if URL already contains /v1/chat/completions,
  //    this is an OpenAI-compatible endpoint. Strip the path to get baseUrl
  //    and create the OpenAI adapter (it re-adds /v1/chat/completions).
  if (url.includes('/v1/chat/completions')) {
    const openAiBase = url.replace(/\/v1\/chat\/completions\/?$/, '').replace(/\/$/, '');
    return createOpenAIAdapter(openAiBase || baseUrl, model, key);
  }

  // 4.5. POST probe — send minimal OpenAI payload to /v1/chat/completions.
  //    Catches endpoints that expose completions but not /v1/models.
  if (await tryOpenAIPost(baseUrl, model, key)) {
    return createOpenAIAdapter(baseUrl, model, key);
  }

  // 5. Fallback to generic HTTP
  return createHttpAdapter(url);
};
