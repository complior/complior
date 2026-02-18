import { describe, it, expect } from 'vitest';
import { detectFrameworks, detectAiTools, detectModelsInSource } from './framework-detector.js';

describe('detectFrameworks', () => {
  it('detects Next.js from dependencies', () => {
    const deps = { next: '^14.0.0', react: '^18.0.0' };
    const result = detectFrameworks(deps);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'Next.js', version: '^14.0.0', confidence: 1.0 });
    expect(result[1]).toEqual({ name: 'React', version: '^18.0.0', confidence: 1.0 });
  });

  it('detects Angular', () => {
    const deps = { '@angular/core': '^17.0.0' };
    const result = detectFrameworks(deps);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: 'Angular', version: '^17.0.0', confidence: 1.0 });
  });

  it('detects backend frameworks', () => {
    const deps = { express: '^4.18.0', fastify: '^4.0.0', hono: '^4.0.0' };
    const result = detectFrameworks(deps);

    expect(result).toHaveLength(3);
    const names = result.map((f) => f.name);
    expect(names).toContain('Express');
    expect(names).toContain('Fastify');
    expect(names).toContain('Hono');
  });

  it('returns empty for no known frameworks', () => {
    const deps = { lodash: '^4.0.0', axios: '^1.0.0' };
    const result = detectFrameworks(deps);

    expect(result).toHaveLength(0);
  });

  it('returns empty for empty dependencies', () => {
    const result = detectFrameworks({});
    expect(result).toHaveLength(0);
  });
});

describe('detectAiTools', () => {
  it('detects OpenAI SDK', () => {
    const deps = { openai: '^4.0.0' };
    const result = detectAiTools(deps);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: 'OpenAI', version: '^4.0.0', type: 'sdk' });
  });

  it('detects Vercel AI SDK as library type', () => {
    const deps = { ai: '^3.0.0' };
    const result = detectAiTools(deps);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: 'Vercel AI SDK', version: '^3.0.0', type: 'library' });
  });

  it('detects multiple AI tools', () => {
    const deps = {
      openai: '^4.0.0',
      '@anthropic-ai/sdk': '^0.20.0',
      '@langchain/core': '^0.2.0',
    };
    const result = detectAiTools(deps);

    expect(result).toHaveLength(3);
    const names = result.map((t) => t.name);
    expect(names).toContain('OpenAI');
    expect(names).toContain('Anthropic');
    expect(names).toContain('LangChain');
  });

  it('returns empty for no AI tools', () => {
    const deps = { express: '^4.0.0' };
    const result = detectAiTools(deps);

    expect(result).toHaveLength(0);
  });
});

describe('detectModelsInSource', () => {
  it('detects GPT-4 model references', () => {
    const files = ['const model = "gpt-4-turbo";'];
    const result = detectModelsInSource(files);

    expect(result).toContain('gpt-4-turbo');
  });

  it('detects Claude model references', () => {
    const files = ['const model = "claude-3-opus";'];
    const result = detectModelsInSource(files);

    expect(result).toContain('claude-3-opus');
  });

  it('detects multiple models across files', () => {
    const files = [
      'const a = "gpt-4-turbo";',
      'const b = "claude-3-sonnet"; const c = "gemini-1.5-pro";',
    ];
    const result = detectModelsInSource(files);

    expect(result).toContain('gpt-4-turbo');
    expect(result).toContain('claude-3-sonnet');
    expect(result).toContain('gemini-1.5-pro');
  });

  it('returns unique models only', () => {
    const files = [
      'const a = "gpt-4"; const b = "gpt-4";',
      'const c = "gpt-4";',
    ];
    const result = detectModelsInSource(files);

    const gpt4Count = result.filter((m) => m === 'gpt-4').length;
    expect(gpt4Count).toBe(1);
  });

  it('detects command-r models', () => {
    const files = ['const model = "command-r-plus";'];
    const result = detectModelsInSource(files);

    expect(result).toContain('command-r-plus');
  });

  it('detects llama and mistral models', () => {
    const files = ['const models = ["llama-3.1-70b", "mistral-large"];'];
    const result = detectModelsInSource(files);

    expect(result).toContain('llama-3.1-70b');
    expect(result).toContain('mistral-large');
  });

  it('returns empty for no model references', () => {
    const files = ['const x = 42; function foo() {}'];
    const result = detectModelsInSource(files);

    expect(result).toHaveLength(0);
  });

  it('returns sorted results', () => {
    const files = ['const a = "gpt-4"; const b = "claude-3-opus";'];
    const result = detectModelsInSource(files);

    const sorted = [...result].sort();
    expect(result).toEqual(sorted);
  });
});
