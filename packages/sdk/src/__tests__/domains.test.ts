import { describe, it, expect } from 'vitest';
import { complior, DomainViolationError, getDomainHooks, mergeDomainHooks } from '../index.js';
import type { MiddlewareConfig } from '../types.js';

const createMockOpenAI = () => ({
  chat: {
    completions: {
      create: async (params: Record<string, unknown>) => ({
        choices: [{ message: { content: 'Result' } }],
        _params: params,
      }),
    },
  },
});

describe('domain-specific middleware', () => {
  describe('domain activation', () => {
    it('adds HR-specific hooks when domain is set to hr', async () => {
      const openai = createMockOpenAI();
      const config: MiddlewareConfig = { jurisdictions: ['EU'], domain: 'hr' };
      const wrapped = complior(openai, config);

      const result = await wrapped.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Evaluate this candidate' }],
      }) as Record<string, unknown>;

      const compliorMeta = result['_complior'] as { metadata: Record<string, unknown>; headers: Record<string, string> };
      expect(compliorMeta.metadata['domain']).toBe('hr');
      expect(compliorMeta.metadata['fairnessAudit']).toBe('required');
      expect(compliorMeta.metadata['worksCouncilNotice']).toBe(true);
      expect(compliorMeta.headers['X-Domain']).toBe('hr');
    });
  });

  describe('HR emotion block', () => {
    it('throws DomainViolationError for emotion analysis in HR context', async () => {
      const openai = createMockOpenAI();
      const config: MiddlewareConfig = { jurisdictions: ['EU'], domain: 'hr' };
      const wrapped = complior(openai, config);

      // Use "emotion analysis" which HR hook catches but base hook doesn't
      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Perform emotion analysis on interview video' }],
        }),
      ).rejects.toThrow(DomainViolationError);

      try {
        await wrapped.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Run emotion detection on candidate responses' }],
        });
        expect.fail('Should have thrown');
      } catch (err) {
        const e = err as InstanceType<typeof DomainViolationError>;
        expect(e.domain).toBe('hr');
        expect(e.obligationId).toBe('OBL-002');
      }
    });
  });

  describe('Finance FRIA', () => {
    it('throws DomainViolationError for credit scoring without FRIA', async () => {
      const openai = createMockOpenAI();
      const config: MiddlewareConfig = { jurisdictions: ['EU'], domain: 'finance' };
      const wrapped = complior(openai, config);

      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Calculate credit score for applicant' }],
        }),
      ).rejects.toThrow(DomainViolationError);
    });
  });

  describe('multi-domain', () => {
    it('can merge hooks from multiple domains', () => {
      const hrHooks = getDomainHooks('hr');
      const financeHooks = getDomainHooks('finance');
      const merged = mergeDomainHooks(['hr', 'finance']);

      expect(merged.pre.length).toBe(hrHooks.pre.length + financeHooks.pre.length);
      expect(merged.post.length).toBe(hrHooks.post.length + financeHooks.post.length);
    });
  });
});
