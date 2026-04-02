import { describe, it, expect, afterEach } from 'vitest';
import { routeModelForProvider, envKeyForTaskType } from './model-routing.js';

describe('envKeyForTaskType', () => {
  it('converts simple task type', () => {
    expect(envKeyForTaskType('classify')).toBe('COMPLIOR_MODEL_CLASSIFY');
  });

  it('converts hyphenated task type', () => {
    expect(envKeyForTaskType('document-generation')).toBe('COMPLIOR_MODEL_DOCUMENT_GENERATION');
  });

  it('converts all task types', () => {
    expect(envKeyForTaskType('qa')).toBe('COMPLIOR_MODEL_QA');
    expect(envKeyForTaskType('code')).toBe('COMPLIOR_MODEL_CODE');
    expect(envKeyForTaskType('report')).toBe('COMPLIOR_MODEL_REPORT');
    expect(envKeyForTaskType('chat')).toBe('COMPLIOR_MODEL_CHAT');
  });
});

describe('routeModelForProvider — env overrides', () => {
  const envKeys = [
    'COMPLIOR_MODEL_CLASSIFY',
    'COMPLIOR_MODEL_DOCUMENT_GENERATION',
    'COMPLIOR_MODEL_CHAT',
    'COMPLIOR_MODEL_CODE',
    'COMPLIOR_MODEL_REPORT',
    'COMPLIOR_MODEL_QA',
  ];

  afterEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  it('returns default model when no env override set', () => {
    const result = routeModelForProvider('classify', 'openrouter');
    expect(result.modelId).toBe('anthropic/claude-haiku-4.5');
    expect(result.reason).not.toContain('Custom model');
  });

  it('uses COMPLIOR_MODEL_CLASSIFY env override', () => {
    process.env['COMPLIOR_MODEL_CLASSIFY'] = 'google/gemini-2.0-flash';
    const result = routeModelForProvider('classify', 'openrouter');
    expect(result.modelId).toBe('google/gemini-2.0-flash');
    expect(result.reason).toBe('Custom model (COMPLIOR_MODEL_CLASSIFY)');
    expect(result.provider).toBe('openrouter');
  });

  it('uses COMPLIOR_MODEL_DOCUMENT_GENERATION env override', () => {
    process.env['COMPLIOR_MODEL_DOCUMENT_GENERATION'] = 'my-custom-model';
    const result = routeModelForProvider('document-generation', 'anthropic');
    expect(result.modelId).toBe('my-custom-model');
    expect(result.reason).toContain('COMPLIOR_MODEL_DOCUMENT_GENERATION');
  });

  it('falls back to default when env var is empty string', () => {
    process.env['COMPLIOR_MODEL_CHAT'] = '';
    const result = routeModelForProvider('chat', 'openai');
    expect(result.modelId).toBe('gpt-4o');
    expect(result.reason).not.toContain('Custom model');
  });

  it('falls back to chat for invalid task type', () => {
    process.env['COMPLIOR_MODEL_CHAT'] = 'override-chat-model';
    const result = routeModelForProvider('nonexistent', 'openrouter');
    expect(result.modelId).toBe('override-chat-model');
  });

  it('env override works for all providers', () => {
    process.env['COMPLIOR_MODEL_QA'] = 'custom-qa-model';
    for (const provider of ['openai', 'anthropic', 'openrouter'] as const) {
      const result = routeModelForProvider('qa', provider);
      expect(result.modelId).toBe('custom-qa-model');
      expect(result.provider).toBe(provider);
    }
  });
});
