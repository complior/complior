import { describe, it, expect } from 'vitest';
import { computeDebt } from './debt-calculator.js';

describe('computeDebt', () => {
  it('returns zero debt when everything is clean', () => {
    const result = computeDebt({
      findings: [],
      passportCompleteness: 100,
      evidenceFreshness: 0,
      daysSinceLastScan: 0,
    });
    expect(result.totalDebt).toBe(0);
    expect(result.level).toBe('low');
  });

  it('calculates findings debt by severity', () => {
    const result = computeDebt({
      findings: [
        { severity: 'critical', status: 'fail', checkId: 'c1' },
        { severity: 'low', status: 'fail', checkId: 'l1' },
      ],
      passportCompleteness: 100,
      evidenceFreshness: 0,
      daysSinceLastScan: 0,
    });
    expect(result.findingsDebt).toBeGreaterThan(0);
    expect(result.breakdown.filter(b => b.category === 'findings')).toHaveLength(2);
  });

  it('ignores passing findings', () => {
    const result = computeDebt({
      findings: [{ severity: 'critical', status: 'pass', checkId: 'c1' }],
      passportCompleteness: 100,
      evidenceFreshness: 0,
      daysSinceLastScan: 0,
    });
    expect(result.findingsDebt).toBe(0);
  });

  it('penalizes incomplete passport', () => {
    const result = computeDebt({
      findings: [],
      passportCompleteness: 50,
      evidenceFreshness: 0,
      daysSinceLastScan: 0,
    });
    expect(result.documentationDebt).toBe(25); // (100-50)*0.5
  });

  it('penalizes stale evidence', () => {
    const result = computeDebt({
      findings: [],
      passportCompleteness: 100,
      evidenceFreshness: 30,
      daysSinceLastScan: 0,
    });
    expect(result.freshnessDebt).toBeGreaterThan(0);
  });

  it('sets level based on total debt', () => {
    expect(computeDebt({
      findings: [],
      passportCompleteness: 100,
      evidenceFreshness: 0,
      daysSinceLastScan: 0,
    }).level).toBe('low');

    // Build up debt to trigger higher levels
    const many = Array.from({ length: 20 }, (_, i) => ({
      severity: 'critical', status: 'fail', checkId: `c${i}`,
    }));
    expect(computeDebt({
      findings: many,
      passportCompleteness: 0,
      evidenceFreshness: 90,
      daysSinceLastScan: 30,
    }).level).toBe('critical');
  });

  it('returns frozen result', () => {
    const result = computeDebt({
      findings: [],
      passportCompleteness: 100,
      evidenceFreshness: 0,
      daysSinceLastScan: 0,
    });
    expect(Object.isFrozen(result)).toBe(true);
  });
});
