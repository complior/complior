import { describe, it, expect } from 'vitest';
import { disclosureVerifyHook } from '../hooks/post/disclosure-verify.js';
import { contentMarkingHook } from '../hooks/post/content-marking.js';
import { escalationHook } from '../hooks/post/escalation.js';
import { headersHook } from '../hooks/post/headers.js';
import { biasCheckHook } from '../hooks/post/bias-check.js';
import type { MiddlewareContext } from '../types.js';

const makeCtx = (metadata: Record<string, unknown> = {}): MiddlewareContext => ({
  provider: 'openai',
  method: 'create',
  config: { jurisdictions: ['EU'] },
  params: {},
  metadata,
});

const openaiResponse = (content: string) => ({
  choices: [{ message: { content } }],
});

const anthropicResponse = (text: string) => ({
  content: [{ text }],
});

describe('post-hooks', () => {
  // ── disclosureVerifyHook ────────────────────────────────────────

  describe('disclosureVerifyHook', () => {
    it('sets disclosureVerified to true when disclosureInjected is truthy', () => {
      const ctx = makeCtx({ disclosureInjected: true });
      const result = disclosureVerifyHook(ctx, {});
      expect(result.metadata['disclosureVerified']).toBe(true);
    });

    it('sets disclosureVerified to false when disclosureInjected is absent', () => {
      const ctx = makeCtx({});
      const result = disclosureVerifyHook(ctx, {});
      expect(result.metadata['disclosureVerified']).toBe(false);
    });

    it('always adds X-AI-Disclosure header', () => {
      const ctx = makeCtx({});
      const result = disclosureVerifyHook(ctx, {});
      expect(result.headers['X-AI-Disclosure']).toBe('true');
    });

    it('passes through the response object unchanged', () => {
      const response = { data: 'test' };
      const result = disclosureVerifyHook(makeCtx(), response);
      expect(result.response).toBe(response);
    });
  });

  // ── contentMarkingHook ──────────────────────────────────────────

  describe('contentMarkingHook', () => {
    it('adds C2PA metadata with producer, timestamp, and provider', () => {
      const ctx = makeCtx();
      const result = contentMarkingHook(ctx, {});
      const c2pa = result.metadata['c2pa'] as Record<string, unknown>;
      expect(c2pa).toBeDefined();
      expect(c2pa['producer']).toBe('@complior/sdk');
      expect(c2pa['provider']).toBe('openai');
      expect(typeof c2pa['timestamp']).toBe('string');
    });

    it('sets X-Content-Marking header to c2pa', () => {
      const result = contentMarkingHook(makeCtx(), {});
      expect(result.headers['X-Content-Marking']).toBe('c2pa');
    });

    it('preserves existing metadata from context', () => {
      const ctx = makeCtx({ existing: 'keep' });
      const result = contentMarkingHook(ctx, {});
      expect(result.metadata['existing']).toBe('keep');
      expect(result.metadata['c2pa']).toBeDefined();
    });
  });

  // ── escalationHook ──────────────────────────────────────────────

  describe('escalationHook', () => {
    it('detects "speak to a human" in OpenAI response format', () => {
      const response = openaiResponse('I cannot help further. Please speak to a human for assistance.');
      const result = escalationHook(makeCtx(), response);
      expect(result.metadata['escalationDetected']).toBe(true);
      expect(result.headers['X-Human-Review']).toBe('requested');
    });

    it('detects "human review" in Anthropic response format', () => {
      const response = anthropicResponse('This requires human review before proceeding.');
      const result = escalationHook(makeCtx(), response);
      expect(result.metadata['escalationDetected']).toBe(true);
      expect(result.headers['X-Human-Review']).toBe('requested');
    });

    it('detects "escalat" keyword variations', () => {
      const response = openaiResponse('I need to escalate this issue to our team.');
      const result = escalationHook(makeCtx(), response);
      expect(result.metadata['escalationDetected']).toBe(true);
    });

    it('detects "transfer to agent"', () => {
      const response = openaiResponse('Let me transfer to agent for more help.');
      const result = escalationHook(makeCtx(), response);
      expect(result.metadata['escalationDetected']).toBe(true);
    });

    it('detects "need a person"', () => {
      const response = anthropicResponse('You might need a person to resolve this.');
      const result = escalationHook(makeCtx(), response);
      expect(result.metadata['escalationDetected']).toBe(true);
    });

    it('does not detect escalation in safe content', () => {
      const response = openaiResponse('Here is your Python code for sorting a list.');
      const result = escalationHook(makeCtx(), response);
      expect(result.metadata['escalationDetected']).toBe(false);
      expect(result.headers['X-Human-Review']).toBeUndefined();
    });

    it('handles string response directly', () => {
      const result = escalationHook(makeCtx(), 'Please escalate this');
      expect(result.metadata['escalationDetected']).toBe(true);
    });

    it('handles null/undefined response without crashing', () => {
      const result = escalationHook(makeCtx(), null);
      expect(result.metadata['escalationDetected']).toBe(false);
    });

    it('handles non-object, non-string response', () => {
      const result = escalationHook(makeCtx(), 42);
      expect(result.metadata['escalationDetected']).toBe(false);
    });
  });

  // ── headersHook ─────────────────────────────────────────────────

  describe('headersHook', () => {
    it('sets X-AI-Disclosure to true', () => {
      const result = headersHook(makeCtx(), {});
      expect(result.headers['X-AI-Disclosure']).toBe('true');
    });

    it('sets X-AI-Provider from context provider', () => {
      const ctx = makeCtx();
      const result = headersHook(ctx, {});
      expect(result.headers['X-AI-Provider']).toBe('openai');
    });

    it('sets X-Content-Marking to c2pa when c2pa metadata present', () => {
      const ctx = makeCtx({ c2pa: { producer: '@complior/sdk' } });
      const result = headersHook(ctx, {});
      expect(result.headers['X-Content-Marking']).toBe('c2pa');
    });

    it('sets X-Content-Marking to none when no c2pa metadata', () => {
      const ctx = makeCtx({});
      const result = headersHook(ctx, {});
      expect(result.headers['X-Content-Marking']).toBe('none');
    });

    it('preserves context metadata without modification', () => {
      const ctx = makeCtx({ foo: 'bar' });
      const result = headersHook(ctx, {});
      expect(result.metadata['foo']).toBe('bar');
    });
  });

  // ── biasCheckHook ───────────────────────────────────────────────

  describe('biasCheckHook', () => {
    it('detects gender bias pattern with "always" + "women"', () => {
      const response = openaiResponse('Women always make better nurses than men.');
      const result = biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
      expect(result.headers['X-Bias-Warning']).toBe('potential-bias-detected');
    });

    it('detects racial generalization pattern with "all" + "race"', () => {
      const response = openaiResponse('All people of a certain race are predisposed to this.');
      const result = biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });

    it('detects superiority bias pattern with "inherently" + "superior"', () => {
      const response = openaiResponse('This group is inherently superior to others.');
      const result = biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });

    it('passes when no bias patterns are found', () => {
      const response = openaiResponse('Here is a balanced analysis of the data.');
      const result = biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(true);
      expect(result.headers['X-Bias-Warning']).toBeUndefined();
    });

    it('works with Anthropic response format', () => {
      const response = anthropicResponse('Men never succeed in this field compared to women.');
      const result = biasCheckHook(makeCtx(), response);
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });

    it('handles empty or null response gracefully', () => {
      const result = biasCheckHook(makeCtx(), null);
      expect(result.metadata['biasCheckPassed']).toBe(true);
    });

    it('handles string response directly', () => {
      const result = biasCheckHook(makeCtx(), 'All ethnic groups are different.');
      // "all" + "ethnic" matches pattern
      expect(result.metadata['biasCheckPassed']).toBe(false);
    });
  });
});
