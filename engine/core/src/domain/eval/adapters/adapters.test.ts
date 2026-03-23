import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHttpAdapter } from './http-adapter.js';
import { createOpenAIAdapter } from './openai-adapter.js';
import { createAnthropicAdapter } from './anthropic-adapter.js';
import { createOllamaAdapter } from './ollama-adapter.js';
import { createCustomAdapter } from './custom-adapter.js';
import { autoDetectAdapter } from './auto-detect.js';
import { safeJsonParse, AdapterError, withRetry } from './adapter-port.js';

// ── Mock fetch ──────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  headers: new Map(Object.entries(headers)),
});

// ── HTTP Adapter ────────────────────────────────────────────────

describe('createHttpAdapter', () => {
  it('sends probe as {message}', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ response: 'I am an AI assistant.' }));
    const adapter = createHttpAdapter('http://localhost:4000/api/chat');
    const result = await adapter.send('Who are you?');

    expect(result.text).toBe('I am an AI assistant.');
    expect(result.status).toBe(200);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
    expect(body.message).toBe('Who are you?');
  });

  it('falls back to JSON.stringify for unknown response shape', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: { text: 'hello' } }));
    const adapter = createHttpAdapter('http://localhost:4000');
    const result = await adapter.send('test');
    expect(result.text).toContain('hello');
  });

  it('sendMultiTurn sends sequential probes', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ response: 'First' }))
      .mockResolvedValueOnce(jsonResponse({ response: 'Second' }));
    const adapter = createHttpAdapter('http://localhost:4000');
    const results = await adapter.sendMultiTurn(['probe1', 'probe2']);
    expect(results).toHaveLength(2);
    expect(results[0]!.text).toBe('First');
    expect(results[1]!.text).toBe('Second');
  });

  it('has name "http"', () => {
    const adapter = createHttpAdapter('http://localhost:4000');
    expect(adapter.name).toBe('http');
  });
});

// ── OpenAI Adapter ──────────────────────────────────────────────

describe('createOpenAIAdapter', () => {
  it('sends to /v1/chat/completions', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      choices: [{ message: { content: 'Hello from GPT' } }],
    }));
    const adapter = createOpenAIAdapter('http://localhost:4000', 'gpt-4o', 'sk-test');
    const result = await adapter.send('Hello');

    expect(result.text).toBe('Hello from GPT');
    expect(mockFetch.mock.calls[0]![0]).toBe('http://localhost:4000/v1/chat/completions');

    const headers = mockFetch.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer sk-test');
  });

  it('supports multi-turn with conversation history', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: 'Turn 1' } }] }))
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: 'Turn 2' } }] }));

    const adapter = createOpenAIAdapter('http://localhost:4000');
    const results = await adapter.sendMultiTurn(['first', 'second']);
    expect(results).toHaveLength(2);

    // Second call should include conversation history
    const body2 = JSON.parse(mockFetch.mock.calls[1]![1]!.body as string);
    expect(body2.messages).toHaveLength(3); // user, assistant, user
  });

  it('has name "openai"', () => {
    expect(createOpenAIAdapter('http://localhost:4000').name).toBe('openai');
  });
});

// ── Anthropic Adapter ───────────────────────────────────────────

describe('createAnthropicAdapter', () => {
  it('sends to /v1/messages with anthropic headers', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      content: [{ type: 'text', text: 'Hello from Claude' }],
    }));
    const adapter = createAnthropicAdapter('http://localhost:4000', 'claude-sonnet-4-20250514', 'sk-ant-test');
    const result = await adapter.send('Hello');

    expect(result.text).toBe('Hello from Claude');
    const headers = mockFetch.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant-test');
    expect(headers['anthropic-version']).toBe('2023-06-01');
  });

  it('has name "anthropic"', () => {
    expect(createAnthropicAdapter('http://localhost:4000').name).toBe('anthropic');
  });
});

// ── Ollama Adapter ──────────────────────────────────────────────

describe('createOllamaAdapter', () => {
  it('sends to /api/chat with stream:false', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      message: { content: 'Hello from Llama' },
    }));
    const adapter = createOllamaAdapter('http://localhost:11434', 'llama3');
    const result = await adapter.send('Hello');

    expect(result.text).toBe('Hello from Llama');
    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
    expect(body.stream).toBe(false);
    expect(body.model).toBe('llama3');
  });

  it('has name "ollama"', () => {
    expect(createOllamaAdapter('http://localhost:11434').name).toBe('ollama');
  });
});

// ── Custom Adapter ──────────────────────────────────────────────

describe('createCustomAdapter', () => {
  it('replaces {{probe}} in template', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: { output: 'Custom response' } }));
    const adapter = createCustomAdapter(
      'http://localhost:4000/custom',
      { input: { text: '{{probe}}' } },
      'data.output',
    );
    const result = await adapter.send('Test probe');

    expect(result.text).toBe('Custom response');
    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
    expect(body.input.text).toBe('Test probe');
  });

  it('has name "custom"', () => {
    const adapter = createCustomAdapter('http://localhost:4000', {}, 'response');
    expect(adapter.name).toBe('custom');
  });
});

// ── Auto-detect ─────────────────────────────────────────────────

describe('autoDetectAdapter', () => {
  it('detects openai:// protocol hint', async () => {
    const adapter = await autoDetectAdapter('openai://localhost:4000', 'gpt-4o', 'sk-test');
    expect(adapter.name).toBe('openai');
  });

  it('detects anthropic:// protocol hint', async () => {
    const adapter = await autoDetectAdapter('anthropic://localhost:4000');
    expect(adapter.name).toBe('anthropic');
  });

  it('detects ollama:// protocol hint', async () => {
    const adapter = await autoDetectAdapter('ollama://localhost:11434');
    expect(adapter.name).toBe('ollama');
  });

  it('probes /v1/models for OpenAI', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/v1/models')) return { status: 200 };
      return { status: 404 };
    });
    const adapter = await autoDetectAdapter('http://localhost:4000');
    expect(adapter.name).toBe('openai');
  });

  it('probes /api/tags for Ollama', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/v1/models')) throw new Error('not found');
      if (url.includes('/api/tags')) return { status: 200 };
      return { status: 404 };
    });
    const adapter = await autoDetectAdapter('http://localhost:11434');
    expect(adapter.name).toBe('ollama');
  });

  it('falls back to http adapter', async () => {
    mockFetch.mockRejectedValue(new Error('connection refused'));
    const adapter = await autoDetectAdapter('http://localhost:9999');
    expect(adapter.name).toBe('http');
  });
});

// ── safeJsonParse ──────────────────────────────────────────────

describe('safeJsonParse', () => {
  it('parses valid JSON from 200 response', async () => {
    const res = { ok: true, status: 200, json: async () => ({ data: 'ok' }) } as unknown as Response;
    const result = await safeJsonParse(res);
    expect(result).toEqual({ data: 'ok' });
  });

  it('throws AdapterError for 429 rate limit', async () => {
    const res = { ok: false, status: 429, json: async () => { throw new Error('not json'); } } as unknown as Response;
    await expect(safeJsonParse(res)).rejects.toThrow(AdapterError);
    await expect(safeJsonParse(res)).rejects.toThrow('429');
  });

  it('throws AdapterError for 500 with JSON error body', async () => {
    const res = { ok: false, status: 500, json: async () => ({ error: { message: 'overloaded' } }) } as unknown as Response;
    await expect(safeJsonParse(res)).rejects.toThrow('overloaded');
  });

  it('AdapterError.retryable is true for 429 and 5xx', () => {
    expect(new AdapterError(429, 'rate limited').retryable).toBe(true);
    expect(new AdapterError(500, 'server error').retryable).toBe(true);
    expect(new AdapterError(502, 'bad gateway').retryable).toBe(true);
    expect(new AdapterError(400, 'bad request').retryable).toBe(false);
    expect(new AdapterError(401, 'unauthorized').retryable).toBe(false);
  });
});

// ── withRetry ──────────────────────────────────────────────────

describe('withRetry', () => {
  it('returns immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, 2, 1);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable AdapterError', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new AdapterError(429, 'rate limited'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, 2, 1);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable AdapterError', async () => {
    const fn = vi.fn().mockRejectedValue(new AdapterError(400, 'bad request'));
    await expect(withRetry(fn, 2, 1)).rejects.toThrow('bad request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry on non-AdapterError', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network error'));
    await expect(withRetry(fn, 2, 1)).rejects.toThrow('network error');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new AdapterError(503, 'unavailable'));
    await expect(withRetry(fn, 2, 1)).rejects.toThrow('unavailable');
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });
});

// ── Adapter error resilience ───────────────────────────────────

describe('adapter error resilience', () => {
  it('openai adapter throws descriptive error on HTML rate-limit response', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 429,
      json: async () => { throw new SyntaxError('Unexpected token <'); },
      headers: new Map(),
    });
    const adapter = createOpenAIAdapter('http://localhost:4000', 'gpt-4o', 'sk-test');
    await expect(adapter.send('test')).rejects.toThrow('API error 429');
  });

  it('anthropic adapter throws descriptive error on 500', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 500,
      json: async () => ({ error: { message: 'internal error' } }),
      headers: new Map(),
    });
    const adapter = createAnthropicAdapter('http://localhost:4000');
    await expect(adapter.send('test')).rejects.toThrow('internal error');
  });
});
