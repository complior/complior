import { describe, it, expect } from 'vitest';
import { determineTaskType, routeModel } from './model-router.js';
import { calculateCost } from './pricing.js';
import { createCostTracker } from './cost-tracker.js';

describe('Model Router', () => {
  it('routes Q&A to haiku', () => {
    const type = determineTaskType('what is Art. 50?', []);
    const selection = routeModel(type);
    expect(selection.model).toBe('claude-haiku-4');
  });

  it('routes report generation to opus', () => {
    const type = determineTaskType('generate report', ['generateReport']);
    const selection = routeModel(type);
    expect(selection.model).toBe('claude-opus-4');
  });

  it('routes code generation to sonnet', () => {
    const type = determineTaskType('create a file', ['createFile']);
    const selection = routeModel(type);
    expect(selection.model).toBe('claude-sonnet-4');
  });

  it('routes scan to haiku', () => {
    const type = determineTaskType('scan project', ['scanProject']);
    expect(type).toBe('scan_fix');
    expect(routeModel(type).model).toBe('claude-haiku-4');
  });

  it('respects manual override', () => {
    const selection = routeModel('qa', 'gpt-4o');
    expect(selection.model).toBe('gpt-4o');
    expect(selection.provider).toBe('openai');
    expect(selection.reason).toContain('Manually selected');
  });
});

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
