import { describe, it, expect, afterEach } from 'vitest';
import { createLlmAdapter } from './llm-adapter.js';

const ENV_KEYS = [
  'OPENROUTER_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'COMPLIOR_LLM_PROVIDER',
];

describe('createLlmAdapter — COMPLIOR_LLM_PROVIDER', () => {
  const saved: Record<string, string | undefined> = {};

  afterEach(() => {
    // Restore original env
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  function saveAndClearEnv(): void {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  }

  it('uses env provider when key is available', () => {
    saveAndClearEnv();
    process.env['OPENAI_API_KEY'] = 'sk-test';
    process.env['OPENROUTER_API_KEY'] = 'sk-or-test';
    process.env['COMPLIOR_LLM_PROVIDER'] = 'openai';

    const adapter = createLlmAdapter();
    const provider = adapter.getDefaultProvider();
    expect(provider).toBe('openai');
  });

  it('falls back to auto-detect when env provider has no key', () => {
    saveAndClearEnv();
    process.env['OPENROUTER_API_KEY'] = 'sk-or-test';
    process.env['COMPLIOR_LLM_PROVIDER'] = 'anthropic'; // no ANTHROPIC_API_KEY

    const adapter = createLlmAdapter();
    const provider = adapter.getDefaultProvider();
    expect(provider).toBe('openrouter'); // first available
  });

  it('ignores invalid provider name', () => {
    saveAndClearEnv();
    process.env['OPENAI_API_KEY'] = 'sk-test';
    process.env['COMPLIOR_LLM_PROVIDER'] = 'invalid-provider';

    const adapter = createLlmAdapter();
    const provider = adapter.getDefaultProvider();
    expect(provider).toBe('openai');
  });

  it('auto-detects without COMPLIOR_LLM_PROVIDER', () => {
    saveAndClearEnv();
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test';

    const adapter = createLlmAdapter();
    const provider = adapter.getDefaultProvider();
    expect(provider).toBe('anthropic');
  });

  it('routeModel uses env provider override', () => {
    saveAndClearEnv();
    process.env['OPENAI_API_KEY'] = 'sk-test';
    process.env['OPENROUTER_API_KEY'] = 'sk-or-test';
    process.env['COMPLIOR_LLM_PROVIDER'] = 'openai';

    const adapter = createLlmAdapter();
    const selection = adapter.routeModel('classify');
    expect(selection.provider).toBe('openai');
    expect(selection.modelId).toBe('gpt-4o-mini');
  });
});
