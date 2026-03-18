import { describe, it, expect } from 'vitest';
import { deduplicateFindings, mergeFindings } from './dedup.js';
import type { Finding } from '../../../types/common.types.js';

const mkFinding = (overrides: Partial<Finding>): Finding => ({
  checkId: 'test',
  type: 'fail',
  message: 'test finding',
  severity: 'medium',
  ...overrides,
});

describe('deduplicateFindings', () => {
  it('removes detect-secrets findings when NHI scanner found same file:line', () => {
    const base = [
      mkFinding({ checkId: 'l4-nhi-api-key', file: 'config.js', line: 5 }),
    ];
    const external = [
      mkFinding({ checkId: 'ext-detect-secrets-HexHighEntropy', file: 'config.js', line: 5 }),
      mkFinding({ checkId: 'ext-detect-secrets-Base64', file: 'other.js', line: 10 }),
    ];

    const result = deduplicateFindings(base, external);
    expect(result).toHaveLength(1);
    expect(result[0]!.file).toBe('other.js');
  });

  it('keeps Semgrep findings even when L4 found same location', () => {
    const base = [
      mkFinding({ checkId: 'l4-bare-llm', file: 'ai.ts', line: 42 }),
    ];
    const external = [
      mkFinding({ checkId: 'ext-semgrep-complior-bare-call', file: 'ai.ts', line: 42 }),
    ];

    const result = deduplicateFindings(base, external);
    expect(result).toHaveLength(1);
    expect(result[0]!.checkId).toBe('ext-semgrep-complior-bare-call');
  });

  it('deduplicates same-tool findings at same file:line', () => {
    const external = [
      mkFinding({ checkId: 'ext-semgrep-rule1', file: 'a.ts', line: 1 }),
      mkFinding({ checkId: 'ext-semgrep-rule1', file: 'a.ts', line: 1 }),
    ];

    const result = deduplicateFindings([], external);
    expect(result).toHaveLength(1);
  });
});

describe('mergeFindings', () => {
  it('removes L4 findings superseded by Semgrep at same location', () => {
    const base = [
      mkFinding({ checkId: 'l4-bare-llm', file: 'ai.ts', line: 42 }),
      mkFinding({ checkId: 'l1-docs-missing', message: 'keep this' }),
    ];
    const external = [
      mkFinding({ checkId: 'ext-semgrep-complior-bare-call', file: 'ai.ts', line: 42 }),
    ];

    const result = mergeFindings(base, external);
    expect(result).toHaveLength(2);
    expect(result.some((f) => f.checkId === 'l4-bare-llm')).toBe(false);
    expect(result.some((f) => f.checkId === 'ext-semgrep-complior-bare-call')).toBe(true);
    expect(result.some((f) => f.checkId === 'l1-docs-missing')).toBe(true);
  });

  it('keeps L4 findings without Semgrep equivalent', () => {
    const base = [
      mkFinding({ checkId: 'l4-bare-llm', file: 'ai.ts', line: 42 }),
    ];
    const external: Finding[] = [];

    const result = mergeFindings(base, external);
    expect(result).toHaveLength(1);
    expect(result[0]!.checkId).toBe('l4-bare-llm');
  });
});
