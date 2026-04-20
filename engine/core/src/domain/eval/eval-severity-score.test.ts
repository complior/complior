/**
 * V1-M12: Eval Severity-Weighted Scoring — RED test spec.
 *
 * Verifies that severity weights (critical=4×, high=2×, medium=1×, low=0.5×)
 * affect category scores. Critical test failures should hurt more than low ones.
 */

import { describe, it, expect } from 'vitest';
import type { TestResult } from './types.js';
import { scoreSeverityWeighted } from './eval-severity-scoring.js';
import severityWeightsData from '../../../data/eval/severity-weights.json' with { type: 'json' };

const makeResult = (
  testId: string,
  category: TestResult['category'],
  verdict: TestResult['verdict'],
  severity: 'critical' | 'high' | 'medium' | 'low',
): TestResult => ({
  testId,
  category,
  name: `Test ${testId}`,
  method: 'deterministic',
  verdict,
  score: verdict === 'pass' ? 100 : 0,
  confidence: 80,
  reasoning: 'Test reasoning',
  probe: 'Hello',
  response: 'Response',
  latencyMs: 100,
  timestamp: '2026-04-20T00:00:00Z',
  severity,
});

describe('V1-M12: Eval Severity-Weighted Scoring', () => {
  it('backward compatible: critical fail + low pass = 11%', () => {
    // With severity weights: critical fail (weight 4) + low pass (weight 0.5)
    // weighted: passed = 0.5, total = 4.0 + 0.5 = 4.5
    // Score = 0.5 / 4.5 * 100 ≈ 11
    const results: TestResult[] = [
      makeResult('CT-1-001', 'transparency', 'fail', 'critical'),
      makeResult('CT-1-002', 'transparency', 'pass', 'low'),
    ];
    const score = scoreSeverityWeighted(results);
    expect(score.categories.find(c => c.category === 'transparency')?.score).toBe(11);
  });

  it('critical failures weighted 4× vs low (severity scoring)', () => {
    // With severity weights: critical fail (weight 4) + low pass (weight 0.5)
    // Weighted: passed = 0.5, total = 4.0 + 0.5 = 4.5
    // Score = 0.5 / 4.5 * 100 ≈ 11
    const results: TestResult[] = [
      makeResult('CT-1-001', 'transparency', 'fail', 'critical'),
      makeResult('CT-1-002', 'transparency', 'pass', 'low'),
    ];
    const score = scoreSeverityWeighted(results);
    expect(score.categories.find(c => c.category === 'transparency')?.score).toBeLessThan(20);
  });

  it('severity weights loaded from JSON data file', () => {
    // Verify the data file has the expected structure
    expect(severityWeightsData).toBeDefined();
    expect(severityWeightsData.weights).toBeDefined();
    expect(severityWeightsData.weights.critical).toBe(4.0);
    expect(severityWeightsData.weights.high).toBe(2.0);
    expect(severityWeightsData.weights.medium).toBe(1.0);
    expect(severityWeightsData.weights.low).toBe(0.5);
    // And that the scoring function actually uses them
    const results: TestResult[] = [
      makeResult('CT-1-001', 'transparency', 'fail', 'critical'),
      makeResult('CT-1-002', 'transparency', 'pass', 'low'),
    ];
    const score = scoreSeverityWeighted(results, severityWeightsData.weights);
    expect(score.categories.find(c => c.category === 'transparency')?.score).toBe(11);
  });

  it('all-pass = 100 regardless of severity mix', () => {
    // All passing tests should yield 100 whether critical or low
    const results: TestResult[] = [
      makeResult('CT-1-001', 'transparency', 'pass', 'critical'),
      makeResult('CT-1-002', 'transparency', 'pass', 'high'),
      makeResult('CT-1-003', 'transparency', 'pass', 'medium'),
      makeResult('CT-1-004', 'transparency', 'pass', 'low'),
    ];
    const score = scoreSeverityWeighted(results);
    expect(score.categories.find(c => c.category === 'transparency')?.score).toBe(100);
  });

  it('mixed results: severity changes category score', () => {
    // 2 critical pass + 1 high fail + 1 low pass
    // Weights: 4+4+2+0.5 = 10.5 total, 4+4+0.5 = 8.5 passed
    // Score = 8.5 / 10.5 * 100 ≈ 81
    const results: TestResult[] = [
      makeResult('CT-1-001', 'transparency', 'pass', 'critical'),
      makeResult('CT-1-002', 'transparency', 'pass', 'critical'),
      makeResult('CT-1-003', 'transparency', 'fail', 'high'),
      makeResult('CT-1-004', 'transparency', 'pass', 'low'),
    ];
    const score = scoreSeverityWeighted(results);
    const catScore = score.categories.find(c => c.category === 'transparency');
    expect(catScore?.score).toBeGreaterThan(75);
    expect(catScore?.score).toBeLessThan(85);
  });
});
