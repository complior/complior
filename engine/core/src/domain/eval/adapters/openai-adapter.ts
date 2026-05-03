/**
 * OpenAI-compatible adapter — sends to `/v1/chat/completions` format.
 * Works with OpenAI, Azure OpenAI, vLLM, LM Studio, and any OpenAI-compatible API.
 */
import type { TargetAdapter } from './adapter-port.js';
import { createChatAdapter } from './create-chat-adapter.js';

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

  return createChatAdapter({
    name: 'openai',
    endpoint,
    defaultTimeout: DEFAULT_TIMEOUT,
    buildHeaders,
    buildInitialMessages: (probe, options) => {
      const msgs: { role: string; content: string }[] = [];
      if (options?.systemPrompt) msgs.push({ role: 'system', content: options.systemPrompt });
      msgs.push({ role: 'user', content: probe });
      return msgs;
    },
    buildMultiTurnPrefix: (options) => {
      const msgs: { role: string; content: string }[] = [];
      if (options?.systemPrompt) msgs.push({ role: 'system', content: options.systemPrompt });
      return msgs;
    },
    buildBody: (messages, options) => ({
      model: effectiveModel,
      messages,
      temperature: options?.temperature ?? 0,
      max_tokens: options?.maxTokens ?? 2048,
    }),
    extractText: (raw) => {
      const choices = raw.choices as { message?: { content?: string } }[] | undefined;
      return choices?.[0]?.message?.content ?? '';
    },
    healthCheck: {
      url: baseUrl.replace(/\/$/, '') + '/v1/models',
      method: 'GET',
      headers: buildHeaders,
      isHealthy: (status) => status < 500,
    },
  });
};
