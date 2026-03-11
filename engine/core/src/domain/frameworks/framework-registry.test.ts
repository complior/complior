import { describe, it, expect } from 'vitest';
import { createFrameworkRegistry } from './framework-registry.js';
import type { ComplianceFramework, FoundationMetrics, FrameworkScoreResult } from '../../types/framework.types.js';

const mockFramework = (id: string): ComplianceFramework => ({
  id,
  name: `Test ${id}`,
  version: '1.0',
  checks: [],
  categories: [],
  gradeMapping: { type: 'letter', thresholds: [{ minScore: 0, grade: 'F' }] },
});

const mockScorer = (fw: ComplianceFramework, _metrics: FoundationMetrics): FrameworkScoreResult => ({
  frameworkId: fw.id,
  frameworkName: fw.name,
  score: 75,
  grade: 'B',
  gradeType: 'letter',
  gaps: 2,
  totalChecks: 10,
  passedChecks: 8,
  categories: [],
});

describe('FrameworkRegistry', () => {
  it('starts empty', () => {
    const reg = createFrameworkRegistry();
    expect(reg.ids()).toEqual([]);
    expect(reg.getAll()).toEqual([]);
  });

  it('registers a framework', () => {
    const reg = createFrameworkRegistry();
    const fw = mockFramework('test-fw');
    reg.register(fw, mockScorer);
    expect(reg.has('test-fw')).toBe(true);
    expect(reg.ids()).toEqual(['test-fw']);
  });

  it('retrieves a registered framework', () => {
    const reg = createFrameworkRegistry();
    const fw = mockFramework('alpha');
    reg.register(fw, mockScorer);
    const entry = reg.get('alpha');
    expect(entry).toBeDefined();
    expect(entry!.definition.id).toBe('alpha');
  });

  it('returns undefined for unknown id', () => {
    const reg = createFrameworkRegistry();
    expect(reg.get('nope')).toBeUndefined();
    expect(reg.has('nope')).toBe(false);
  });

  it('registers multiple frameworks', () => {
    const reg = createFrameworkRegistry();
    reg.register(mockFramework('a'), mockScorer);
    reg.register(mockFramework('b'), mockScorer);
    expect(reg.ids()).toEqual(['a', 'b']);
    expect(reg.getAll()).toHaveLength(2);
  });

  it('overwrites on duplicate id', () => {
    const reg = createFrameworkRegistry();
    const fw1 = mockFramework('dup');
    const fw2 = { ...mockFramework('dup'), name: 'Updated' };
    reg.register(fw1, mockScorer);
    reg.register(fw2, mockScorer);
    expect(reg.get('dup')!.definition.name).toBe('Updated');
    expect(reg.ids()).toEqual(['dup']);
  });

  it('scorer produces FrameworkScoreResult', () => {
    const reg = createFrameworkRegistry();
    const fw = mockFramework('score-test');
    reg.register(fw, mockScorer);
    const entry = reg.get('score-test')!;
    const result = entry.score(entry.definition, {} as FoundationMetrics);
    expect(result.score).toBe(75);
    expect(result.grade).toBe('B');
  });

  it('getAll returns frozen array', () => {
    const reg = createFrameworkRegistry();
    reg.register(mockFramework('x'), mockScorer);
    const all = reg.getAll();
    expect(Array.isArray(all)).toBe(true);
    expect(all).toHaveLength(1);
  });
});
