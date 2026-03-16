import { describe, it, expect } from 'vitest';
import { analyzeStructure } from './swc-analyzer.js';

describe('analyzeStructure', () => {
  it('detects LLM calls without error handling', () => {
    const code = `const result = await client.create({ model: 'gpt-4' });`;
    const findings = analyzeStructure(code, 'src/chat.ts', '.ts');
    const missing = findings.find((f) => f.type === 'missing-error-handling');
    expect(missing).toBeDefined();
  });

  it('does not flag LLM calls with try-catch', () => {
    const code = `try { const result = await client.create({}); } catch (e) { console.error(e); }`;
    const findings = analyzeStructure(code, 'src/chat.ts', '.ts');
    const missing = findings.find((f) => f.type === 'missing-error-handling');
    expect(missing).toBeUndefined();
  });

  it('detects safety config mutations', () => {
    const code = `config.safety = false;\noptions.moderation = 'none';`;
    const findings = analyzeStructure(code, 'src/config.ts', '.ts');
    const mutations = findings.filter((f) => f.type === 'safety-mutation');
    expect(mutations.length).toBeGreaterThanOrEqual(1);
  });

  it('detects unsafe method calls', () => {
    const code = `client.dangerouslyAllow('all');`;
    const findings = analyzeStructure(code, 'src/setup.ts', '.ts');
    expect(findings.some((f) => f.type === 'safety-mutation')).toBe(true);
  });

  it('detects Python compliance decorators', () => {
    const code = `@require_approval\ndef process_data():\n    pass`;
    const findings = analyzeStructure(code, 'src/handler.py', '.py');
    expect(findings.some((f) => f.type === 'decorator-pattern')).toBe(true);
  });

  it('returns empty for clean code', () => {
    const code = `const x = 1;\nconst y = 2;`;
    const findings = analyzeStructure(code, 'src/utils.ts', '.ts');
    expect(findings).toEqual([]);
  });

  it('returns empty for non-supported extension', () => {
    const code = `killSwitch = true`;
    const findings = analyzeStructure(code, 'src/readme.md', '.md');
    expect(findings).toEqual([]);
  });
});
