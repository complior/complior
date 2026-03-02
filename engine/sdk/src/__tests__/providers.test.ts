import { describe, it, expect } from 'vitest';
import { openaiAdapter, OPENAI_PROXY_METHODS } from '../providers/openai.js';
import { anthropicAdapter, ANTHROPIC_PROXY_METHODS } from '../providers/anthropic.js';
import { googleAdapter, GOOGLE_PROXY_METHODS } from '../providers/google.js';
import { vercelAiAdapter, VERCEL_AI_PROXY_METHODS } from '../providers/vercel-ai.js';

describe('providers', () => {
  // ── openaiAdapter ───────────────────────────────────────────────

  describe('openaiAdapter', () => {
    it('has the correct provider name', () => {
      expect(openaiAdapter.name).toBe('openai');
    });

    it('returns a proxy for the "chat" method', () => {
      const mockTarget = { completions: { create: () => {} } };
      const result = openaiAdapter.getMethodProxy(mockTarget, 'chat');
      expect(result).not.toBeNull();
    });

    it('returns null for non-chat methods', () => {
      const result = openaiAdapter.getMethodProxy({}, 'embeddings');
      expect(result).toBeNull();
    });

    it('exposes the correct proxy method paths', () => {
      expect(OPENAI_PROXY_METHODS).toEqual(['chat.completions.create']);
    });
  });

  // ── anthropicAdapter ────────────────────────────────────────────

  describe('anthropicAdapter', () => {
    it('has the correct provider name', () => {
      expect(anthropicAdapter.name).toBe('anthropic');
    });

    it('returns a proxy for the "messages" method', () => {
      const mockTarget = { create: () => {} };
      const result = anthropicAdapter.getMethodProxy(mockTarget, 'messages');
      expect(result).not.toBeNull();
    });

    it('returns null for non-messages methods', () => {
      const result = anthropicAdapter.getMethodProxy({}, 'completions');
      expect(result).toBeNull();
    });

    it('exposes the correct proxy method paths', () => {
      expect(ANTHROPIC_PROXY_METHODS).toEqual(['messages.create']);
    });
  });

  // ── googleAdapter ───────────────────────────────────────────────

  describe('googleAdapter', () => {
    it('has the correct provider name', () => {
      expect(googleAdapter.name).toBe('google');
    });

    it('returns null for generateContent (handled at top level)', () => {
      const result = googleAdapter.getMethodProxy({}, 'generateContent');
      expect(result).toBeNull();
    });

    it('returns null for unknown methods', () => {
      const result = googleAdapter.getMethodProxy({}, 'unknownMethod');
      expect(result).toBeNull();
    });

    it('exposes the correct proxy method paths', () => {
      expect(GOOGLE_PROXY_METHODS).toEqual(['generateContent']);
    });
  });

  // ── vercelAiAdapter ─────────────────────────────────────────────

  describe('vercelAiAdapter', () => {
    it('has the correct provider name', () => {
      expect(vercelAiAdapter.name).toBe('vercel-ai');
    });

    it('returns null for streamText (handled at top level)', () => {
      const result = vercelAiAdapter.getMethodProxy({}, 'streamText');
      expect(result).toBeNull();
    });

    it('returns null for generateText (handled at top level)', () => {
      const result = vercelAiAdapter.getMethodProxy({}, 'generateText');
      expect(result).toBeNull();
    });

    it('returns null for unknown methods', () => {
      const result = vercelAiAdapter.getMethodProxy({}, 'embed');
      expect(result).toBeNull();
    });

    it('exposes the correct proxy method paths', () => {
      expect(VERCEL_AI_PROXY_METHODS).toEqual(['streamText', 'generateText']);
    });
  });
});
