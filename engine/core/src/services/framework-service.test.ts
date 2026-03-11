import { describe, it, expect } from 'vitest';
import { createFrameworkService } from './framework-service.js';
import { createFrameworkRegistry } from '../domain/frameworks/framework-registry.js';
import type { ComplianceFramework, FoundationMetrics, FrameworkScoreResult } from '../types/framework.types.js';
import type { FoundationMetricsDeps } from '../domain/frameworks/collect-foundation-metrics.js';

const mockFw = (id: string): ComplianceFramework => ({
  id,
  name: `Test ${id}`,
  version: '1.0',
  checks: [],
  categories: [],
  gradeMapping: { type: 'letter', thresholds: [{ minScore: 0, grade: 'F' }] },
});

const mockScorer = (score: number) => (fw: ComplianceFramework, _m: FoundationMetrics): FrameworkScoreResult => ({
  frameworkId: fw.id,
  frameworkName: fw.name,
  score,
  grade: score >= 90 ? 'A' : 'B',
  gradeType: 'letter',
  gaps: 0,
  totalChecks: 10,
  passedChecks: Math.round(score / 10),
  categories: [],
});

const mockDeps: FoundationMetricsDeps = {
  getLastScanResult: () => null,
  getPassport: async () => null,
  getPassportCompleteness: async () => 0,
  getEvidenceSummary: async () => ({
    totalEntries: 0,
    scanCount: 0,
    firstEntry: '',
    lastEntry: '',
    chainValid: false,
    uniqueFindings: 0,
  }),
  getDocuments: async () => new Set<string>(),
};

describe('FrameworkService', () => {
  it('lists available frameworks', () => {
    const reg = createFrameworkRegistry();
    reg.register(mockFw('a'), mockScorer(80));
    reg.register(mockFw('b'), mockScorer(60));

    const svc = createFrameworkService({
      registry: reg,
      getSelectedFrameworks: () => ['a'],
      foundationDeps: mockDeps,
    });
    expect(svc.listAvailable()).toEqual(['a', 'b']);
  });

  it('lists selected frameworks', () => {
    const reg = createFrameworkRegistry();
    reg.register(mockFw('a'), mockScorer(80));

    const svc = createFrameworkService({
      registry: reg,
      getSelectedFrameworks: () => ['a'],
      foundationDeps: mockDeps,
    });
    expect(svc.listSelected()).toEqual(['a']);
  });

  it('returns scores for selected frameworks', async () => {
    const reg = createFrameworkRegistry();
    reg.register(mockFw('x'), mockScorer(85));
    reg.register(mockFw('y'), mockScorer(55));

    const svc = createFrameworkService({
      registry: reg,
      getSelectedFrameworks: () => ['x', 'y'],
      foundationDeps: mockDeps,
    });

    const result = await svc.getScores();
    expect(result.frameworks).toHaveLength(2);
    expect(result.frameworks[0].frameworkId).toBe('x');
    expect(result.frameworks[0].score).toBe(85);
    expect(result.frameworks[1].frameworkId).toBe('y');
    expect(result.selectedFrameworkIds).toEqual(['x', 'y']);
    expect(result.computedAt).toBeDefined();
  });

  it('skips unregistered frameworks', async () => {
    const reg = createFrameworkRegistry();
    reg.register(mockFw('real'), mockScorer(70));

    const svc = createFrameworkService({
      registry: reg,
      getSelectedFrameworks: () => ['real', 'missing'],
      foundationDeps: mockDeps,
    });

    const result = await svc.getScores();
    expect(result.frameworks).toHaveLength(1);
    expect(result.frameworks[0].frameworkId).toBe('real');
  });

  it('getScore returns single framework score', async () => {
    const reg = createFrameworkRegistry();
    reg.register(mockFw('solo'), mockScorer(92));

    const svc = createFrameworkService({
      registry: reg,
      getSelectedFrameworks: () => ['solo'],
      foundationDeps: mockDeps,
    });

    const result = await svc.getScore('solo');
    expect(result).not.toBeNull();
    expect(result!.score).toBe(92);
    expect(result!.grade).toBe('A');
  });

  it('getScore returns null for unknown framework', async () => {
    const reg = createFrameworkRegistry();
    const svc = createFrameworkService({
      registry: reg,
      getSelectedFrameworks: () => [],
      foundationDeps: mockDeps,
    });
    const result = await svc.getScore('unknown');
    expect(result).toBeNull();
  });

  it('returns empty frameworks when none selected', async () => {
    const reg = createFrameworkRegistry();
    reg.register(mockFw('avail'), mockScorer(50));

    const svc = createFrameworkService({
      registry: reg,
      getSelectedFrameworks: () => [],
      foundationDeps: mockDeps,
    });

    const result = await svc.getScores();
    expect(result.frameworks).toHaveLength(0);
  });

  it('computedAt is ISO string', async () => {
    const reg = createFrameworkRegistry();
    reg.register(mockFw('ts'), mockScorer(70));

    const svc = createFrameworkService({
      registry: reg,
      getSelectedFrameworks: () => ['ts'],
      foundationDeps: mockDeps,
    });

    const result = await svc.getScores();
    expect(() => new Date(result.computedAt)).not.toThrow();
    expect(result.computedAt).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
