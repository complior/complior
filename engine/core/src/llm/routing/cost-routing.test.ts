import { describe, it, expect } from 'vitest';
import { calculateCost } from './pricing.js';
import { createCostTracker } from './cost-tracker.js';

describe('Pricing', () => {
  it('calculates cost for claude-haiku-4', () => {
    const cost = calculateCost('claude-haiku-4', 1000, 2000);
    // (1000 * 0.80 + 2000 * 4.0) / 1_000_000 = 0.0088
    expect(cost).toBeCloseTo(0.0088, 4);
  });

  it('returns 0 for unknown model', () => {
    expect(calculateCost('unknown-model', 1000, 1000)).toBe(0);
  });
});

describe('Cost Tracker', () => {
  it('records and aggregates costs', () => {
    const tracker = createCostTracker();
    tracker.record('qa', 'claude-haiku-4', 1000, 2000);
    tracker.record('report', 'claude-opus-4', 2000, 10000);

    const breakdown = tracker.getBreakdown();
    expect(breakdown.entries).toHaveLength(2);
    expect(breakdown.totalCost).toBeGreaterThan(0);
    expect(breakdown.byTaskType['qa']?.calls).toBe(1);
    expect(breakdown.byTaskType['report']?.calls).toBe(1);
  });

  it('formats cost line', () => {
    const tracker = createCostTracker();
    const entry = tracker.record('qa', 'claude-haiku-4', 1000, 2000);
    const line = tracker.formatCostLine(entry);
    expect(line).toContain('$');
    expect(line).toContain('tokens');
  });
});
