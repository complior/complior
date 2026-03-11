import { describe, it, expect } from 'vitest';
import { simulateActions } from './simulate-actions.js';

describe('simulateActions', () => {
  const baseInput = {
    currentScore: 60,
    findings: [
      { checkId: 'l1-risk', severity: 'critical', status: 'fail' },
      { checkId: 'l2-fria', severity: 'high', status: 'fail' },
      { checkId: 'l3-sdk', severity: 'medium', status: 'fail' },
    ],
    passportCompleteness: 70,
  };

  it('simulates fixing a critical finding', () => {
    const result = simulateActions({
      ...baseInput,
      actions: [{ type: 'fix', target: 'l1-risk' }],
    });
    expect(result.currentScore).toBe(60);
    expect(result.projectedScore).toBeGreaterThan(60);
    expect(result.delta).toBeGreaterThan(0);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]!.scoreImpact).toBe(5.0);
    expect(result.actions[0]!.description).toContain('critical');
  });

  it('simulates fixing a high-severity finding', () => {
    const result = simulateActions({
      ...baseInput,
      actions: [{ type: 'fix', target: 'l2-fria' }],
    });
    expect(result.actions[0]!.scoreImpact).toBe(3.0);
    expect(result.delta).toBe(3.0);
  });

  it('simulates fixing a medium-severity finding', () => {
    const result = simulateActions({
      ...baseInput,
      actions: [{ type: 'fix', target: 'l3-sdk' }],
    });
    expect(result.actions[0]!.scoreImpact).toBe(1.5);
  });

  it('returns zero impact for non-existent finding', () => {
    const result = simulateActions({
      ...baseInput,
      actions: [{ type: 'fix', target: 'nonexistent' }],
    });
    expect(result.actions[0]!.scoreImpact).toBe(0);
    expect(result.delta).toBe(0);
    expect(result.actions[0]!.description).toContain('not found');
  });

  it('returns zero impact for already-passing finding', () => {
    const result = simulateActions({
      ...baseInput,
      findings: [{ checkId: 'l1-risk', severity: 'critical', status: 'pass' }],
      actions: [{ type: 'fix', target: 'l1-risk' }],
    });
    expect(result.actions[0]!.scoreImpact).toBe(0);
    expect(result.actions[0]!.description).toContain('not found or already passing');
  });

  it('simulates adding a FRIA document', () => {
    const result = simulateActions({
      ...baseInput,
      actions: [{ type: 'add-doc', target: 'fria' }],
    });
    expect(result.delta).toBe(4.0);
    expect(result.actions[0]!.description).toContain('fria');
  });

  it('simulates adding a technical-documentation doc', () => {
    const result = simulateActions({
      ...baseInput,
      actions: [{ type: 'add-doc', target: 'technical-documentation' }],
    });
    expect(result.delta).toBe(3.0);
  });

  it('uses default impact for unknown doc type', () => {
    const result = simulateActions({
      ...baseInput,
      actions: [{ type: 'add-doc', target: 'some-custom-doc' }],
    });
    expect(result.delta).toBe(2.0);
  });

  it('simulates completing passport field', () => {
    const result = simulateActions({
      ...baseInput,
      actions: [{ type: 'complete-passport', target: 'description' }],
    });
    expect(result.delta).toBe(1.0);
    expect(result.actions[0]!.description).toContain('description');
  });

  it('returns zero for passport already at 100%', () => {
    const result = simulateActions({
      ...baseInput,
      passportCompleteness: 100,
      actions: [{ type: 'complete-passport', target: 'description' }],
    });
    expect(result.delta).toBe(0);
    expect(result.actions[0]!.description).toContain('100% complete');
  });

  it('handles multiple actions', () => {
    const result = simulateActions({
      ...baseInput,
      actions: [
        { type: 'fix', target: 'l1-risk' },
        { type: 'add-doc', target: 'fria' },
        { type: 'complete-passport', target: 'description' },
      ],
    });
    expect(result.actions).toHaveLength(3);
    expect(result.projectedScore).toBeGreaterThan(result.currentScore);
    // 5.0 + 4.0 + 1.0 = 10.0
    expect(result.delta).toBe(10.0);
    expect(result.projectedScore).toBe(70);
  });

  it('caps projected score at 100', () => {
    const result = simulateActions({
      currentScore: 98,
      findings: [{ checkId: 'x', severity: 'critical', status: 'fail' }],
      passportCompleteness: 100,
      actions: [{ type: 'fix', target: 'x' }],
    });
    expect(result.projectedScore).toBe(100);
    // delta should be capped too: 100 - 98 = 2, not the raw 5.0
    expect(result.delta).toBe(2);
  });

  it('returns frozen result', () => {
    const result = simulateActions({
      ...baseInput,
      actions: [{ type: 'fix', target: 'l1-risk' }],
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('returns frozen action results', () => {
    const result = simulateActions({
      ...baseInput,
      actions: [{ type: 'fix', target: 'l1-risk' }],
    });
    expect(Object.isFrozen(result.actions)).toBe(true);
    expect(Object.isFrozen(result.actions[0])).toBe(true);
  });

  it('preserves currentScore in result', () => {
    const result = simulateActions({
      ...baseInput,
      actions: [{ type: 'fix', target: 'l1-risk' }],
    });
    expect(result.currentScore).toBe(60);
  });
});
