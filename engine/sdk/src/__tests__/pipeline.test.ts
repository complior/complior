import { describe, it, expect, vi } from 'vitest';
import { createPipeline } from '../pipeline.js';
import { complior, ProhibitedPracticeError } from '../index.js';
import type { MiddlewareConfig, MiddlewareContext, DomainHooks, PreHook, PostHook } from '../types.js';

const defaultConfig: MiddlewareConfig = { jurisdictions: ['EU'], role: 'provider' };

const makeCtx = (params: Record<string, unknown> = {}): MiddlewareContext => ({
  provider: 'openai',
  method: 'create',
  config: defaultConfig,
  params,
  metadata: {},
});

// Mock clients
const createMockOpenAI = (response: Record<string, unknown> = { choices: [{ message: { content: 'Hello!' } }] }) => ({
  chat: {
    completions: {
      create: async (params: Record<string, unknown>) => ({ ...response, _params: params }),
    },
  },
  models: { list: async () => ['gpt-4'] },
});

const createMockAnthropic = (response: Record<string, unknown> = { content: [{ text: 'Hello!' }] }) => ({
  messages: {
    create: async (params: Record<string, unknown>) => ({ ...response, _params: params }),
  },
});

const createMockGoogle = (response: Record<string, unknown> = { text: 'Hello from Gemini' }) => ({
  generateContent: async (params: Record<string, unknown>) => ({ ...response, _params: params }),
});

const createMockVercelAI = (response: Record<string, unknown> = { text: 'Hello from Vercel AI' }) => ({
  generateText: async (params: Record<string, unknown>) => ({ ...response, _params: params }),
  streamText: async (params: Record<string, unknown>) => ({ ...response, _params: params }),
});

describe('pipeline', () => {
  describe('createPipeline', () => {
    it('runPre executes all base pre-hooks in order', () => {
      const pipeline = createPipeline(defaultConfig);
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const result = pipeline.runPre(ctx);

      // loggerHook should add loggedAt, provider, method
      expect(result.metadata['loggedAt']).toBeDefined();
      expect(result.metadata['provider']).toBe('openai');
      expect(result.metadata['method']).toBe('create');
      // disclosureHook should add disclosureInjected
      expect(result.metadata['disclosureInjected']).toBe(true);
      // sanitizeHook should set piiRedacted count
      expect(result.metadata['piiRedacted']).toBe(0);
    });

    it('runPost executes all base post-hooks and accumulates metadata', () => {
      const pipeline = createPipeline(defaultConfig);
      const ctx = makeCtx();

      const response = { choices: [{ message: { content: 'Safe response' } }] };
      const result = pipeline.runPost(ctx, response);

      // disclosureVerifyHook
      expect(result.metadata['disclosureVerified']).toBeDefined();
      // contentMarkingHook
      expect(result.metadata['c2pa']).toBeDefined();
      // escalationHook
      expect(result.metadata['escalationDetected']).toBe(false);
      // biasCheckHook
      expect(result.metadata['biasCheckPassed']).toBe(true);
      // headersHook
      expect(result.headers['X-AI-Disclosure']).toBe('true');
      expect(result.headers['X-AI-Provider']).toBe('openai');
    });

    it('runPost accumulates headers from all post-hooks', () => {
      const pipeline = createPipeline(defaultConfig);
      const ctx = makeCtx();
      const response = { choices: [{ message: { content: 'Hello' } }] };
      const result = pipeline.runPost(ctx, response);

      // Headers from disclosureVerifyHook, contentMarkingHook, headersHook, etc.
      expect(result.headers['X-AI-Disclosure']).toBe('true');
      expect(result.headers['X-Content-Marking']).toBeDefined();
      expect(result.headers['X-AI-Provider']).toBe('openai');
    });

    it('short-circuits on prohibited content in runPre', () => {
      const pipeline = createPipeline(defaultConfig);
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'Implement social scoring for residents' }],
      });

      expect(() => pipeline.runPre(ctx)).toThrow(ProhibitedPracticeError);
    });

    it('includes domain pre-hooks after base hooks', () => {
      const callOrder: string[] = [];
      const domainPreHook: PreHook = (ctx) => {
        callOrder.push('domain-pre');
        return { ...ctx, metadata: { ...ctx.metadata, domainPre: true } };
      };
      const domainPostHook: PostHook = (ctx, response) => {
        callOrder.push('domain-post');
        return { response, metadata: { ...ctx.metadata, domainPost: true }, headers: {} };
      };
      const domainHooks: DomainHooks = { pre: [domainPreHook], post: [domainPostHook] };

      const pipeline = createPipeline(defaultConfig, domainHooks);
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'Hello' }],
      });
      const preResult = pipeline.runPre(ctx);

      // Domain pre-hook should have run (after base hooks)
      expect(preResult.metadata['domainPre']).toBe(true);
      // Base hooks should also have run
      expect(preResult.metadata['loggedAt']).toBeDefined();
      expect(preResult.metadata['disclosureInjected']).toBe(true);
    });

    it('includes domain post-hooks before base post-hooks', () => {
      const domainPostHook: PostHook = (ctx, response) => {
        return { response, metadata: { ...ctx.metadata, domainPost: true }, headers: { 'X-Domain': 'test' } };
      };
      const domainHooks: DomainHooks = { pre: [], post: [domainPostHook] };

      const pipeline = createPipeline(defaultConfig, domainHooks);
      const ctx = makeCtx();
      const result = pipeline.runPost(ctx, {});

      // Domain post-hook should have run
      expect(result.metadata['domainPost']).toBe(true);
      // Base post-hooks should also have run (and accumulated)
      expect(result.metadata['c2pa']).toBeDefined();
      expect(result.headers['X-AI-Disclosure']).toBe('true');
    });

    it('returns a frozen pipeline object', () => {
      const pipeline = createPipeline(defaultConfig);
      expect(Object.isFrozen(pipeline)).toBe(true);
    });
  });

  // ── complior() proxy ────────────────────────────────────────────

  describe('complior() proxy', () => {
    it('detects OpenAI provider by "chat" property', async () => {
      const client = createMockOpenAI();
      const wrapped = complior(client, defaultConfig);

      const result = await wrapped.chat.completions.create({
        messages: [{ role: 'user', content: 'Hi' }],
      }) as Record<string, unknown>;

      const meta = result['_complior'] as { headers: Record<string, string> };
      expect(meta.headers['X-AI-Provider']).toBe('openai');
    });

    it('detects Anthropic provider by "messages" property', async () => {
      const client = createMockAnthropic();
      const wrapped = complior(client, defaultConfig);

      const result = await wrapped.messages.create({
        messages: [{ role: 'user', content: 'Hi' }],
      }) as Record<string, unknown>;

      const meta = result['_complior'] as { headers: Record<string, string> };
      expect(meta.headers['X-AI-Provider']).toBe('anthropic');
    });

    it('detects Google provider by "generateContent" property', async () => {
      const client = createMockGoogle();
      const wrapped = complior(client, defaultConfig);

      const result = await wrapped.generateContent({
        messages: [{ role: 'user', content: 'Hi' }],
      }) as Record<string, unknown>;

      const meta = result['_complior'] as { headers: Record<string, string> };
      expect(meta.headers['X-AI-Provider']).toBe('google');
    });

    it('detects Vercel AI provider by "generateText" property', async () => {
      const client = createMockVercelAI();
      const wrapped = complior(client, defaultConfig);

      const result = await wrapped.generateText({
        messages: [{ role: 'user', content: 'Hi' }],
      }) as Record<string, unknown>;

      const meta = result['_complior'] as { headers: Record<string, string> };
      expect(meta.headers['X-AI-Provider']).toBe('vercel-ai');
    });

    it('passes non-intercepted properties through unchanged', () => {
      const client = createMockOpenAI();
      const wrapped = complior(client, defaultConfig);
      // models.list is not intercepted
      expect(wrapped.models).toBe(client.models);
    });

    it('attaches _complior metadata to response object', async () => {
      const client = createMockOpenAI();
      const wrapped = complior(client, defaultConfig);

      const result = await wrapped.chat.completions.create({
        messages: [{ role: 'user', content: 'Hello' }],
      }) as Record<string, unknown>;

      const compliorMeta = result['_complior'] as { metadata: Record<string, unknown>; headers: Record<string, string> };
      expect(compliorMeta).toBeDefined();
      expect(compliorMeta.metadata).toBeDefined();
      expect(compliorMeta.headers).toBeDefined();
    });

    it('runs PII sanitization through the proxy pipeline', async () => {
      const client = createMockOpenAI();
      const wrapped = complior(client, defaultConfig);

      const result = await wrapped.chat.completions.create({
        messages: [{ role: 'user', content: 'My SSN is 123-45-6789' }],
      }) as Record<string, unknown>;

      // The params sent to the mock should have the SSN redacted
      const params = result['_params'] as Record<string, unknown>;
      const messages = params['messages'] as { role: string; content: string }[];
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg!.content).toContain('[PII:SSN]');
      expect(userMsg!.content).not.toContain('123-45-6789');
    });

    it('works with default empty config', async () => {
      const client = createMockOpenAI();
      // No config provided — defaults to {}
      const wrapped = complior(client);

      const result = await wrapped.chat.completions.create({
        messages: [{ role: 'user', content: 'Hi' }],
      }) as Record<string, unknown>;

      expect(result['_complior']).toBeDefined();
    });

    it('resolves domain hooks from config.domain string', async () => {
      const client = createMockOpenAI();
      const wrapped = complior(client, { jurisdictions: ['EU'], domain: 'hr' });

      const result = await wrapped.chat.completions.create({
        messages: [{ role: 'user', content: 'Evaluate this candidate' }],
      }) as Record<string, unknown>;

      const meta = result['_complior'] as { metadata: Record<string, unknown> };
      expect(meta.metadata['domain']).toBe('hr');
      expect(meta.metadata['worksCouncilNotice']).toBe(true);
    });

    it('resolves domain hooks from config.domain array', async () => {
      const client = createMockOpenAI();
      const wrapped = complior(client, { jurisdictions: ['EU'], domain: ['hr', 'finance'] });

      const result = await wrapped.chat.completions.create({
        messages: [{ role: 'user', content: 'Evaluate this candidate' }],
      }) as Record<string, unknown>;

      const meta = result['_complior'] as { metadata: Record<string, unknown> };
      // Should have metadata from both domains
      expect(meta.metadata['worksCouncilNotice']).toBe(true);
    });

    it('prefers explicitly provided domainHooks over config.domain', async () => {
      const customPreHook: PreHook = (ctx) => ({
        ...ctx,
        metadata: { ...ctx.metadata, customHookRan: true },
      });
      const customPostHook: PostHook = (ctx, response) => ({
        response,
        metadata: { ...ctx.metadata, customPost: true },
        headers: {},
      });

      const client = createMockOpenAI();
      const wrapped = complior(
        client,
        { jurisdictions: ['EU'], domain: 'hr' },
        { pre: [customPreHook], post: [customPostHook] },
      );

      const result = await wrapped.chat.completions.create({
        messages: [{ role: 'user', content: 'Hello' }],
      }) as Record<string, unknown>;

      const meta = result['_complior'] as { metadata: Record<string, unknown> };
      expect(meta.metadata['customHookRan']).toBe(true);
      // HR hooks should NOT run since explicit domainHooks take precedence
      expect(meta.metadata['domain']).toBeUndefined();
    });

    it('throws ProhibitedPracticeError before calling the API', async () => {
      const createFn = vi.fn();
      const client = {
        chat: {
          completions: { create: createFn },
        },
      };
      const wrapped = complior(client, defaultConfig);

      await expect(
        wrapped.chat.completions.create({
          messages: [{ role: 'user', content: 'Perform emotion recognition' }],
        }),
      ).rejects.toThrow(ProhibitedPracticeError);

      // The original API should never have been called
      expect(createFn).not.toHaveBeenCalled();
    });
  });
});
