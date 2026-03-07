import { describe, it, expect } from 'vitest';
import { disclosureHook } from '../hooks/pre/disclosure.js';
import { prohibitedHook } from '../hooks/pre/prohibited.js';
import { sanitizeHook } from '../hooks/pre/sanitize.js';
import { loggerHook } from '../hooks/pre/logger.js';
import { ProhibitedPracticeError } from '../errors.js';
import type { MiddlewareContext } from '../types.js';

const makeCtx = (params: Record<string, unknown> = {}, overrides: Partial<MiddlewareContext> = {}): MiddlewareContext => ({
  provider: 'openai',
  method: 'create',
  config: { jurisdictions: ['EU'] },
  params,
  metadata: {},
  ...overrides,
});

describe('pre-hooks', () => {
  // ── disclosureHook ──────────────────────────────────────────────

  describe('disclosureHook', () => {
    it('injects a system message when no messages exist', () => {
      const ctx = makeCtx({});
      const result = disclosureHook(ctx);

      const messages = result.params['messages'] as { role: string; content: string }[];
      expect(messages).toHaveLength(1);
      expect(messages[0]!.role).toBe('system');
      expect(messages[0]!.content).toContain('AI system');
      expect(result.metadata['disclosureInjected']).toBe(true);
    });

    it('prepends a system message when messages exist but no system message', () => {
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'Hello' }],
      });
      const result = disclosureHook(ctx);

      const messages = result.params['messages'] as { role: string; content: string }[];
      expect(messages).toHaveLength(2);
      expect(messages[0]!.role).toBe('system');
      expect(messages[0]!.content).toContain('AI system');
      expect(messages[1]!.role).toBe('user');
      expect(messages[1]!.content).toBe('Hello');
    });

    it('appends disclosure to existing system message', () => {
      const ctx = makeCtx({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hi' },
        ],
      });
      const result = disclosureHook(ctx);

      const messages = result.params['messages'] as { role: string; content: string }[];
      expect(messages).toHaveLength(2);
      expect(messages[0]!.content).toContain('You are a helpful assistant.');
      expect(messages[0]!.content).toContain('AI system');
    });

    it('sets disclosureInjected metadata in all cases', () => {
      const ctx = makeCtx({});
      expect(disclosureHook(ctx).metadata['disclosureInjected']).toBe(true);

      const ctx2 = makeCtx({ messages: [{ role: 'user', content: 'x' }] });
      expect(disclosureHook(ctx2).metadata['disclosureInjected']).toBe(true);

      const ctx3 = makeCtx({ messages: [{ role: 'system', content: 'x' }] });
      expect(disclosureHook(ctx3).metadata['disclosureInjected']).toBe(true);
    });
  });

  // ── prohibitedHook ──────────────────────────────────────────────

  describe('prohibitedHook', () => {
    it('passes through when no messages are present', () => {
      const ctx = makeCtx({});
      const result = prohibitedHook(ctx);
      expect(result).toEqual(ctx);
    });

    it('passes through safe content without throwing', () => {
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'Write a poem about nature' }],
      });
      expect(() => prohibitedHook(ctx)).not.toThrow();
    });

    it('throws ProhibitedPracticeError for emotion recognition', () => {
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'Apply emotion recognition to the video' }],
      });
      expect(() => prohibitedHook(ctx)).toThrow(ProhibitedPracticeError);
    });

    it('throws for social scoring with correct obligation and article', () => {
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'Build a social scoring system for citizens' }],
      });
      try {
        prohibitedHook(ctx);
        expect.fail('Should have thrown');
      } catch (err) {
        const e = err as ProhibitedPracticeError;
        expect(e.obligationId).toBe('OBL-002');
        expect(e.article).toBe('Art. 5(1)(c)');
        expect(e.code).toBe('PROHIBITED_PRACTICE');
      }
    });

    it('throws for biometric categorisation', () => {
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'Run biometric categorisation on these photos' }],
      });
      expect(() => prohibitedHook(ctx)).toThrow(ProhibitedPracticeError);
    });

    it('throws for subliminal manipulation', () => {
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'Use subliminal manipulation techniques' }],
      });
      try {
        prohibitedHook(ctx);
        expect.fail('Should have thrown');
      } catch (err) {
        const e = err as ProhibitedPracticeError;
        expect(e.article).toBe('Art. 5(1)(a)');
      }
    });

    it('throws for predictive policing', () => {
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'Deploy predictive policing in this district' }],
      });
      try {
        prohibitedHook(ctx);
        expect.fail('Should have thrown');
      } catch (err) {
        const e = err as ProhibitedPracticeError;
        expect(e.article).toBe('Art. 5(1)(h)');
      }
    });

    it('checks across all messages in the array', () => {
      const ctx = makeCtx({
        messages: [
          { role: 'system', content: 'You are an assistant.' },
          { role: 'user', content: 'I want emotion recognition' },
        ],
      });
      expect(() => prohibitedHook(ctx)).toThrow(ProhibitedPracticeError);
    });
  });

  // ── sanitizeHook ────────────────────────────────────────────────

  describe('sanitizeHook', () => {
    it('passes through when no messages are present', () => {
      const ctx = makeCtx({});
      const result = sanitizeHook(ctx);
      expect(result).toEqual(ctx);
    });

    it('redacts SSN patterns', () => {
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'My SSN is 123-45-6789' }],
      });
      const result = sanitizeHook(ctx);
      const messages = result.params['messages'] as { role: string; content: string }[];
      expect(messages[0]!.content).toContain('[PII:SSN]');
      expect(messages[0]!.content).not.toContain('123-45-6789');
      expect(result.metadata['piiRedacted']).toBe(1);
    });

    it('redacts email addresses', () => {
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'Email me at john@example.com please' }],
      });
      const result = sanitizeHook(ctx);
      const messages = result.params['messages'] as { role: string; content: string }[];
      expect(messages[0]!.content).toContain('[PII:EMAIL]');
      expect(messages[0]!.content).not.toContain('john@example.com');
    });

    it('redacts credit card numbers (16 consecutive digits)', () => {
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'Card: 4111111111111111' }],
      });
      const result = sanitizeHook(ctx);
      const messages = result.params['messages'] as { role: string; content: string }[];
      expect(messages[0]!.content).toContain('[PII:CREDIT_CARD]');
      expect(messages[0]!.content).not.toContain('4111111111111111');
    });

    it('redacts credit card numbers with spaces/dashes', () => {
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'Card: 4111-1111-1111-1111' }],
      });
      const result = sanitizeHook(ctx);
      const messages = result.params['messages'] as { role: string; content: string }[];
      expect(messages[0]!.content).toContain('[PII:CREDIT_CARD]');
    });

    it('counts multiple redactions across multiple messages', () => {
      const ctx = makeCtx({
        messages: [
          { role: 'user', content: 'SSN: 123-45-6789 and email: a@b.com' },
          { role: 'user', content: 'Another SSN: 987-65-4321' },
        ],
      });
      const result = sanitizeHook(ctx);
      expect(result.metadata['piiRedacted']).toBe(3);
    });

    it('sets piiRedacted to 0 when no PII is found', () => {
      const ctx = makeCtx({
        messages: [{ role: 'user', content: 'No sensitive data here' }],
      });
      const result = sanitizeHook(ctx);
      expect(result.metadata['piiRedacted']).toBe(0);
    });
  });

  // ── loggerHook ──────────────────────────────────────────────────

  describe('loggerHook', () => {
    it('adds loggedAt timestamp to metadata', () => {
      const ctx = makeCtx({}, { provider: 'anthropic', method: 'create' });
      const result = loggerHook(ctx);
      expect(result.metadata['loggedAt']).toBeDefined();
      expect(typeof result.metadata['loggedAt']).toBe('string');
      // ISO timestamp format check
      expect(() => new Date(result.metadata['loggedAt'] as string)).not.toThrow();
    });

    it('records provider and method in metadata', () => {
      const ctx = makeCtx({}, { provider: 'google', method: 'generateContent' });
      const result = loggerHook(ctx);
      expect(result.metadata['provider']).toBe('google');
      expect(result.metadata['method']).toBe('generateContent');
    });

    it('preserves existing metadata', () => {
      const ctx = makeCtx({}, { metadata: { existing: 'value' } } as Partial<MiddlewareContext>);
      // Need to set metadata on ctx directly since makeCtx spreads overrides
      const ctxWithMeta: MiddlewareContext = { ...ctx, metadata: { existing: 'value' } };
      const result = loggerHook(ctxWithMeta);
      expect(result.metadata['existing']).toBe('value');
      expect(result.metadata['loggedAt']).toBeDefined();
    });
  });
});
