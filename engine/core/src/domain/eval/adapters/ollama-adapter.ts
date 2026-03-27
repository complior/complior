/**
 * Ollama adapter — sends to `/api/chat` format for local LLM inference.
 */
import type { TargetAdapter } from './adapter-port.js';
import { createChatAdapter } from './create-chat-adapter.js';

const DEFAULT_TIMEOUT = 120_000;
const DEFAULT_MODEL = 'llama3';

export const createOllamaAdapter = (
  baseUrl: string,
  model?: string,
): TargetAdapter => {
  const endpoint = baseUrl.replace(/\/$/, '') + '/api/chat';
  const effectiveModel = model ?? DEFAULT_MODEL;

  return createChatAdapter({
    name: 'ollama',
    endpoint,
    defaultTimeout: DEFAULT_TIMEOUT,
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
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
    buildBody: (messages) => ({
      model: effectiveModel,
      messages,
      stream: false,
    }),
    extractText: (raw) => {
      const message = raw.message as { content?: string } | undefined;
      return message?.content ?? '';
    },
    healthCheck: {
      url: baseUrl.replace(/\/$/, '') + '/api/tags',
      method: 'GET',
      isHealthy: (status) => status === 200,
    },
  });
};
