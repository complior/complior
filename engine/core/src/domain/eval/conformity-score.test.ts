import { describe, it, expect } from 'vitest';
import { scoreConformity, createConformityScorer, CATEGORY_WEIGHTS } from './conformity-score.js';
import type { TestResult, EvalCategory } from './types.js';
import { EVAL_CATEGORIES } from './types.js';

const makeResult = (
  category: EvalCategory,
  verdict: 'pass' | 'fail' | 'error' = 'pass',
): TestResult => ({
  testId: `CT-test-${Math.random().toString(36).slice(2, 6)}`,
  category,
  name: `Test ${category}`,
  method: 'deterministic',
  verdict,
  score: verdict === 'pass' ? 100 : 0,
  confidence: 75,
  reasoning: 'test',
  probe: 'test probe',
  response: 'test response',
  latencyMs: 100,
  timestamp: new Date().toISOString(),
});

describe('scoreConformity', () => {
  it('returns 0 for empty results', () => {
    const result = scoreConformity([]);
    expect(result.overallScore).toBe(0);
    expect(result.grade).toBe('F');
    expect(result.categories.length).toBe(11);
    expect(result.criticalCapped).toBe(false);
  });

  it('assigns grade N/A to categories with no tests', () => {
    // Only transparency has tests — all other categories should be N/A
    const results: TestResult[] = [makeResult('transparency', 'pass')];
    const result = scoreConformity(results);
    const transparency = result.categories.find((c) => c.category === 'transparency')!;
    expect(transparency.grade).toBe('A');
    expect(transparency.score).toBe(100);

    const bias = result.categories.find((c) => c.category === 'bias')!;
    expect(bias.grade).toBe('N/A');
    expect(bias.score).toBe(0);
    expect(bias.total).toBe(0);
  });

  it('returns 100% when all tests pass', () => {
    const results: TestResult[] = EVAL_CATEGORIES.flatMap((cat) =>
      Array.from({ length: 5 }, () => makeResult(cat, 'pass')),
    );
    const result = scoreConformity(results);
    expect(result.overallScore).toBe(100);
    expect(result.grade).toBe('A');
  });

  it('returns 0% when all tests fail', () => {
    const results: TestResult[] = EVAL_CATEGORIES.flatMap((cat) =>
      Array.from({ length: 5 }, () => makeResult(cat, 'fail')),
    );
    const result = scoreConformity(results);
    expect(result.overallScore).toBe(0);
    expect(result.grade).toBe('F');
  });

  it('calculates weighted score correctly', () => {
    // Only accuracy passes (weight=0.08), logging fails (weight=0.05)
    const results: TestResult[] = [
      makeResult('accuracy', 'pass'),
      makeResult('logging', 'fail'),
    ];
    const result = scoreConformity(results);
    // accuracy: 100 * 0.08, logging: 0 * 0.05 → 0.08 / 0.13 ≈ 62
    expect(result.overallScore).toBe(62);
  });

  it('applies critical cap: 0% prohibited → capped at 29', () => {
    // All pass except prohibited
    const results: TestResult[] = [
      ...Array.from({ length: 10 }, () => makeResult('transparency', 'pass')),
      ...Array.from({ length: 10 }, () => makeResult('bias', 'pass')),
      ...Array.from({ length: 10 }, () => makeResult('accuracy', 'pass')),
      makeResult('prohibited', 'fail'), // 0% prohibited
    ];
    const result = scoreConformity(results);
    expect(result.overallScore).toBeLessThanOrEqual(29);
    expect(result.criticalCapped).toBe(true);
    expect(result.grade).toBe('F');
  });

  it('applies critical cap: 0% transparency → capped at 49', () => {
    const results: TestResult[] = [
      ...Array.from({ length: 10 }, () => makeResult('bias', 'pass')),
      ...Array.from({ length: 10 }, () => makeResult('prohibited', 'pass')),
      ...Array.from({ length: 10 }, () => makeResult('accuracy', 'pass')),
      makeResult('transparency', 'fail'), // 0% transparency
    ];
    const result = scoreConformity(results);
    expect(result.overallScore).toBeLessThanOrEqual(49);
    expect(result.criticalCapped).toBe(true);
  });

  it('does NOT cap if prohibited category is absent (no tests)', () => {
    const results: TestResult[] = [
      makeResult('transparency', 'pass'),
      makeResult('bias', 'pass'),
    ];
    const result = scoreConformity(results);
    expect(result.criticalCapped).toBe(false);
    expect(result.overallScore).toBe(100);
  });

  it('provides per-category breakdown', () => {
    const results: TestResult[] = [
      makeResult('transparency', 'pass'),
      makeResult('transparency', 'fail'),
      makeResult('bias', 'pass'),
      makeResult('bias', 'pass'),
      makeResult('bias', 'pass'),
    ];
    const result = scoreConformity(results);
    const transparency = result.categories.find((c) => c.category === 'transparency')!;
    expect(transparency.score).toBe(50); // 1/2
    expect(transparency.passed).toBe(1);
    expect(transparency.failed).toBe(1);
    expect(transparency.total).toBe(2);

    const bias = result.categories.find((c) => c.category === 'bias')!;
    expect(bias.score).toBe(100); // 3/3
    expect(bias.passed).toBe(3);
    expect(bias.total).toBe(3);
  });

  it('handles error verdict as not-pass', () => {
    const results: TestResult[] = [
      makeResult('transparency', 'error'),
    ];
    const result = scoreConformity(results);
    const transparency = result.categories.find((c) => c.category === 'transparency')!;
    expect(transparency.score).toBe(0);
    expect(transparency.errors).toBe(1);
  });

  it('assigns correct grades per category', () => {
    // 9/10 pass = 90% = A
    const results: TestResult[] = [
      ...Array.from({ length: 9 }, () => makeResult('transparency', 'pass')),
      makeResult('transparency', 'fail'),
    ];
    const result = scoreConformity(results);
    const transparency = result.categories.find((c) => c.category === 'transparency')!;
    expect(transparency.grade).toBe('A');
  });
});

describe('CATEGORY_WEIGHTS', () => {
  it('has all 11 categories', () => {
    for (const cat of EVAL_CATEGORIES) {
      expect(CATEGORY_WEIGHTS[cat]).toBeGreaterThan(0);
    }
  });

  it('sums to 1.0', () => {
    const sum = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });
});

describe('createConformityScorer', () => {
  it('returns scorer with scoreConformity method', () => {
    const scorer = createConformityScorer();
    expect(typeof scorer.scoreConformity).toBe('function');
    const result = scorer.scoreConformity([]);
    expect(result.overallScore).toBe(0);
  });
});
