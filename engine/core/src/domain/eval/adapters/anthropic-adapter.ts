/**
 * Anthropic-compatible adapter — sends to `/v1/messages` format.
 */
import type { TargetAdapter } from './adapter-port.js';
import { createChatAdapter } from './create-chat-adapter.js';

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

  return createChatAdapter({
    name: 'anthropic',
    endpoint,
    defaultTimeout: DEFAULT_TIMEOUT,
    buildHeaders,
    // Anthropic: system prompt goes in body, not in messages
    buildInitialMessages: (probe) => [{ role: 'user', content: probe }],
    buildMultiTurnPrefix: () => [],
    buildBody: (messages, options) => {
      const body: Record<string, unknown> = {
        model: effectiveModel,
        max_tokens: options?.maxTokens ?? 2048,
        messages,
      };
      if (options?.systemPrompt) body.system = options.systemPrompt;
      if (options?.temperature !== undefined) body.temperature = options.temperature;
      return body;
    },
    extractText: (raw) => {
      const content = raw.content as { type?: string; text?: string }[] | undefined;
      return content?.find((c) => c.type === 'text')?.text ?? '';
    },
    healthCheck: {
      url: endpoint,
      method: 'POST',
      headers: buildHeaders,
      body: { model: effectiveModel, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] },
      isHealthy: (status) => status < 500,
    },
  });
};
