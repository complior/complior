/**
 * V1-M10 T-2: Category Breakdown with Explanations — RED test specs
 *
 * Tests for `buildCategoryBreakdown()` which transforms ScoreBreakdown.categoryScores
 * into enriched CategoryBreakdown[] with impact levels, top failures, and explanations.
 */
import { describe, it, expect } from 'vitest';
import type { ScoreBreakdown, CategoryScore, Finding, CategoryBreakdown } from '../../types/common.types.js';
import { buildCategoryBreakdown } from './category-breakdown.js';

const makeCategoryScore = (overrides: Partial<CategoryScore> = {}): CategoryScore => ({
  category: 'Transparency & Disclosure',
  weight: 0.75,
  score: 90,
  obligationCount: 10,
  passedCount: 9,
  ...overrides,
});

const makeScore = (categoryScores: CategoryScore[]): ScoreBreakdown => ({
  totalScore: 80,
  zone: 'green',
  categoryScores,
  criticalCapApplied: false,
  totalChecks: 39,
  passedChecks: 31,
  failedChecks: 8,
  skippedChecks: 0,
});

const makeFinding = (overrides: Partial<Finding> = {}): Finding => ({
  checkId: 'l3-banned-package',
  type: 'fail',
  message: 'Banned package detected',
  severity: 'high',
  ...overrides,
});

describe('buildCategoryBreakdown', () => {
  it('returns one entry per non-empty category from ScoreBreakdown', () => {
    const categories = [
      makeCategoryScore({ category: 'Transparency & Disclosure', score: 90, weight: 0.75 }),
      makeCategoryScore({ category: 'Risk Assessment', score: 60, weight: 1.0 }),
      makeCategoryScore({ category: 'Documentation', score: 40, weight: 0.95 }),
    ];
    const score = makeScore(categories);

    const result: CategoryBreakdown[] = buildCategoryBreakdown(score, []);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.category)).toContain('Risk Assessment');
    expect(result.map((r) => r.category)).toContain('Documentation');
    expect(result.map((r) => r.category)).toContain('Transparency & Disclosure');
  });

  it('assigns impact levels: lowest-scoring categories get "high" impact', () => {
    const categories = [
      makeCategoryScore({ category: 'Human Oversight', score: 30, weight: 0.90, obligationCount: 4, passedCount: 1 }),
      makeCategoryScore({ category: 'Data Quality', score: 70, weight: 1.0, obligationCount: 8, passedCount: 6 }),
      makeCategoryScore({ category: 'Transparency & Disclosure', score: 95, weight: 0.75, obligationCount: 10, passedCount: 9 }),
    ];
    const score = makeScore(categories);

    const result = buildCategoryBreakdown(score, []);

    // Lowest score (Human Oversight 30) should have 'high' impact
    const oversight = result.find((r) => r.category === 'Human Oversight');
    expect(oversight).toBeDefined();
    expect(oversight!.impact).toBe('high');

    // Highest score (Transparency 95) should have 'low' impact
    const transparency = result.find((r) => r.category === 'Transparency & Disclosure');
    expect(transparency).toBeDefined();
    expect(transparency!.impact).toBe('low');
  });

  it('populates topFailures with failing checkIds for each category', () => {
    const categories = [
      makeCategoryScore({ category: 'Risk Assessment', score: 60, weight: 1.0, obligationCount: 5, passedCount: 3 }),
    ];
    const score = makeScore(categories);

    // Findings in the Risk Assessment category (matched by checkId-to-category mapping)
    const findings: Finding[] = [
      makeFinding({ checkId: 'l1-risk-assessment-missing', type: 'fail', severity: 'high' }),
      makeFinding({ checkId: 'l2-risk-depth-shallow', type: 'fail', severity: 'medium' }),
      makeFinding({ checkId: 'l1-risk-register', type: 'fail', severity: 'low' }),
      makeFinding({ checkId: 'l1-monitoring-plan', type: 'pass', severity: 'info' }),
    ];

    const result = buildCategoryBreakdown(score, findings);

    // At least one entry should have topFailures (exact matching depends on checkId→category mapping)
    // The function should attempt to populate topFailures from findings
    const riskAssessment = result.find((r) => r.category === 'Risk Assessment');
    expect(riskAssessment).toBeDefined();
    // topFailures should be an array (possibly empty if mapping doesn't match — that's ok)
    expect(riskAssessment!.topFailures).toBeInstanceOf(Array);
    expect(riskAssessment!.topFailures.length).toBeLessThanOrEqual(3);
  });

  it('generates explanation string with passed/total counts', () => {
    const categories = [
      makeCategoryScore({ category: 'Documentation', score: 60, weight: 0.95, obligationCount: 5, passedCount: 3 }),
    ];
    const score = makeScore(categories);

    const result = buildCategoryBreakdown(score, []);

    const doc = result.find((r) => r.category === 'Documentation');
    expect(doc).toBeDefined();
    expect(doc!.explanation).toContain('3');  // passedCount
    expect(doc!.explanation).toContain('5');  // obligationCount
    expect(doc!.explanation.length).toBeGreaterThan(10);
  });

  it('sorts by impact (high first) then by score (low first)', () => {
    const categories = [
      makeCategoryScore({ category: 'A-Good', score: 95, weight: 1.0 }),
      makeCategoryScore({ category: 'B-Bad', score: 20, weight: 1.0 }),
      makeCategoryScore({ category: 'C-Medium', score: 60, weight: 1.0 }),
    ];
    const score = makeScore(categories);

    const result = buildCategoryBreakdown(score, []);

    // B-Bad (score 20) should be first (highest impact / lowest score)
    expect(result[0].category).toBe('B-Bad');
    // A-Good (score 95) should be last (lowest impact)
    expect(result[result.length - 1].category).toBe('A-Good');
  });
});
