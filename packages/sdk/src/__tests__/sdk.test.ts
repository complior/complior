import { describe, it, expect } from 'vitest';
import { complior, ProhibitedPracticeError } from '../index.js';
import type { MiddlewareConfig } from '../types.js';

// Mock OpenAI-like client
const createMockOpenAI = (response: Record<string, unknown> = { choices: [{ message: { content: 'Hello!' } }] }) => ({
  chat: {
    completions: {
      create: async (params: Record<string, unknown>) => ({ ...response, _params: params }),
    },
  },
  models: { list: async () => ['gpt-4'] },
});

// Mock Anthropic-like client
const createMockAnthropic = (response: Record<string, unknown> = { content: [{ text: 'Hello!' }] }) => ({
  messages: {
    create: async (params: Record<string, unknown>) => ({ ...response, _params: params }),
  },
});

const defaultConfig: MiddlewareConfig = { jurisdictions: ['EU'], role: 'provider' };

describe('@complior/sdk', () => {
  describe('wrapping', () => {
    it('returns a proxied client that preserves the original interface', () => {
      const openai = createMockOpenAI();
      const wrapped = complior(openai, defaultConfig);

      expect(wrapped.chat).toBeDefined();
      expect(wrapped.chat.completions).toBeDefined();
      expect(typeof wrapped.chat.completions.create).toBe('function');
      // Non-intercepted methods pass through
      expect(wrapped.models).toBe(openai.models);
    });
  });

  describe('pre-hooks', () => {
    it('injects disclosure and blocks prohibited practices', async () => {
      const openai = createMockOpenAI();
      const wrapped = complior(openai, defaultConfig);

      const result = await wrapped.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Write a poem' }],
      }) as Record<string, unknown>;

      // Disclosure should be injected
      const params = result['_params'] as Record<string, unknown>;
      const messages = params['messages'] as { role: string; content: string }[];
      const systemMsg = messages.find((m) => m.role === 'system');
      expect(systemMsg).toBeDefined();
      expect(systemMsg!.content).toContain('AI system');

      // Prohibited practice should throw
      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Perform emotion recognition on this face' }],
        }),
      ).rejects.toThrow(ProhibitedPracticeError);
    });
  });

  describe('post-hooks', () => {
    it('adds C2PA metadata and compliance headers', async () => {
      const openai = createMockOpenAI();
      const wrapped = complior(openai, defaultConfig);

      const result = await wrapped.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      }) as Record<string, unknown>;

      const compliorMeta = result['_complior'] as { metadata: Record<string, unknown>; headers: Record<string, string> };
      expect(compliorMeta).toBeDefined();
      expect(compliorMeta.metadata['c2pa']).toBeDefined();
      expect(compliorMeta.headers['X-AI-Disclosure']).toBe('true');
      expect(compliorMeta.headers['X-AI-Provider']).toBe('openai');
      expect(compliorMeta.headers['X-Content-Marking']).toBe('c2pa');
    });
  });

  describe('multi-provider', () => {
    it('works across OpenAI and Anthropic adapters', async () => {
      const openai = createMockOpenAI();
      const anthropic = createMockAnthropic();

      const wrappedOpenAI = complior(openai, defaultConfig);
      const wrappedAnthropic = complior(anthropic, defaultConfig);

      const openaiResult = await wrappedOpenAI.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
      }) as Record<string, unknown>;

      const anthropicResult = await wrappedAnthropic.messages.create({
        model: 'claude-3',
        messages: [{ role: 'user', content: 'Hi' }],
      }) as Record<string, unknown>;

      // Both should have complior metadata
      expect((openaiResult['_complior'] as Record<string, unknown>)['headers']).toBeDefined();
      expect((anthropicResult['_complior'] as Record<string, unknown>)['headers']).toBeDefined();

      // Provider should be correctly detected
      const openaiHeaders = (openaiResult['_complior'] as { headers: Record<string, string> }).headers;
      const anthropicHeaders = (anthropicResult['_complior'] as { headers: Record<string, string> }).headers;
      expect(openaiHeaders['X-AI-Provider']).toBe('openai');
      expect(anthropicHeaders['X-AI-Provider']).toBe('anthropic');
    });
  });

  describe('error handling', () => {
    it('throws ProhibitedPracticeError with obligation details', async () => {
      const openai = createMockOpenAI();
      const wrapped = complior(openai, defaultConfig);

      try {
        await wrapped.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Implement social scoring system' }],
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ProhibitedPracticeError);
        const e = err as InstanceType<typeof ProhibitedPracticeError>;
        expect(e.obligationId).toBe('OBL-002');
        expect(e.article).toBe('Art. 5(1)(c)');
        expect(e.code).toBe('PROHIBITED_PRACTICE');
      }
    });
  });
});
