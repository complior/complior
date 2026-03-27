/**
 * Factory for chat-based eval adapters (OpenAI, Anthropic, Ollama).
 * Eliminates duplicated send/sendMultiTurn/checkHealth boilerplate.
 * Each adapter provides only: body builder, response parser, health config.
 */
import type { TargetAdapter, TargetResponse, ProbeOptions } from './adapter-port.js';
import { safeJsonParse, withRetry } from './adapter-port.js';
import { withTimeout, extractResponseHeaders } from './with-timeout.js';

interface ChatMessage {
  readonly role: string;
  readonly content: string;
}

interface HealthCheckConfig {
  readonly url: string;
  readonly method: 'GET' | 'POST';
  readonly headers?: () => Record<string, string>;
  readonly body?: unknown;
  readonly isHealthy: (status: number) => boolean;
}

export interface ChatAdapterConfig {
  readonly name: string;
  readonly endpoint: string;
  readonly defaultTimeout: number;
  readonly buildHeaders: () => Record<string, string>;
  /** Build request body from conversation messages + options. */
  readonly buildBody: (messages: readonly ChatMessage[], options?: ProbeOptions) => unknown;
  /** Extract response text from parsed JSON. */
  readonly extractText: (raw: Record<string, unknown>) => string;
  /** Build initial message list for single send (handles system prompt placement). */
  readonly buildInitialMessages: (probe: string, options?: ProbeOptions) => ChatMessage[];
  /** Build initial message list for multi-turn (conversation prefix). */
  readonly buildMultiTurnPrefix: (options?: ProbeOptions) => ChatMessage[];
  readonly healthCheck: HealthCheckConfig;
}

export const createChatAdapter = (config: ChatAdapterConfig): TargetAdapter => {
  const { endpoint, defaultTimeout, buildHeaders, buildBody, extractText, buildInitialMessages, buildMultiTurnPrefix, healthCheck } = config;

  const send = async (probe: string, options?: ProbeOptions): Promise<TargetResponse> => {
    const start = Date.now();
    const timeout = options?.timeout ?? defaultTimeout;
    const messages = buildInitialMessages(probe, options);

    return withRetry(async () => withTimeout(async (signal) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(buildBody(messages, options)),
        signal,
      });
      const latencyMs = Date.now() - start;
      const raw = await safeJsonParse(res);
      const text = extractText(raw);
      return { text, status: res.status, headers: extractResponseHeaders(res), latencyMs, raw };
    }, timeout));
  };

  const sendMultiTurn = async (probes: readonly string[], options?: ProbeOptions): Promise<readonly TargetResponse[]> => {
    const results: TargetResponse[] = [];
    const messages: ChatMessage[] = buildMultiTurnPrefix(options);

    for (const probe of probes) {
      messages.push({ role: 'user', content: probe });
      const start = Date.now();
      const timeout = options?.timeout ?? defaultTimeout;

      const result = await withRetry(async () => withTimeout(async (signal) => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify(buildBody([...messages], options)),
          signal,
        });
        const latencyMs = Date.now() - start;
        const raw = await safeJsonParse(res);
        const text = extractText(raw);
        return { text, status: res.status, headers: extractResponseHeaders(res), latencyMs, raw };
      }, timeout));
      messages.push({ role: 'assistant', content: result.text });
      results.push(result);
    }
    return results;
  };

  const checkHealth = async (): Promise<boolean> => {
    try {
      return await withTimeout(async (signal) => {
        const fetchOpts: RequestInit = { method: healthCheck.method, signal };
        if (healthCheck.headers) fetchOpts.headers = healthCheck.headers();
        if (healthCheck.body) {
          fetchOpts.body = JSON.stringify(healthCheck.body);
          fetchOpts.headers = { ...fetchOpts.headers as Record<string, string>, 'Content-Type': 'application/json' };
        }
        const res = await fetch(healthCheck.url, fetchOpts);
        return healthCheck.isHealthy(res.status);
      }, 5000);
    } catch {
      return false;
    }
  };

  return Object.freeze({ send, sendMultiTurn, checkHealth, name: config.name });
};
