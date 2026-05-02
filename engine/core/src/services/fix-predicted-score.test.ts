/**
 * V1-M30.9 / W-3: predicted score capped at 99 (not 100).
 *
 * The fix preview path lives in BOTH:
 *   - cli/src/headless/fix.rs (Rust offline estimate, cap fixed in this hotfix)
 *   - engine/core/src/domain/whatif/simulate-actions.ts (engine simulation)
 *
 * This test verifies the engine simulation path: simulateActions caps at 99.
 * (Pre-existing simulate-actions.test.ts also asserts cap=99 after V1-M30.9 W-3
 * spec supersession.)
 */

import { describe, it, expect } from 'vitest';
import { simulateActions } from '../domain/whatif/simulate-actions.js';

describe('V1-M30.9 W-3: predicted score capped at 99 (not 100)', () => {
  it('high baseline + critical fix → projectedScore <= 99', () => {
    const result = simulateActions({
      currentScore: 95,
      findings: [{ checkId: 'x', severity: 'critical', status: 'fail' }],
      passportCompleteness: 100,
      actions: [{ type: 'fix', target: 'x' }],
    } as never);
    expect(result.projectedScore).toBeLessThanOrEqual(99);
    expect(result.projectedScore).toBeGreaterThan(95);
  });

  it('huge fix impact does NOT push score to 100', () => {
    const result = simulateActions({
      currentScore: 50,
      findings: [
        { checkId: 'a', severity: 'critical', status: 'fail' },
        { checkId: 'b', severity: 'critical', status: 'fail' },
        { checkId: 'c', severity: 'critical', status: 'fail' },
        { checkId: 'd', severity: 'critical', status: 'fail' },
        { checkId: 'e', severity: 'critical', status: 'fail' },
      ],
      passportCompleteness: 100,
      actions: [
        { type: 'fix', target: 'a' },
        { type: 'fix', target: 'b' },
        { type: 'fix', target: 'c' },
        { type: 'fix', target: 'd' },
        { type: 'fix', target: 'e' },
      ],
    } as never);
    // Even with huge fix impact, never 100 (100 implies certainty)
    expect(result.projectedScore).not.toBe(100);
    expect(result.projectedScore).toBeLessThanOrEqual(99);
  });

  it('low baseline + small fix → realistic delta, not 100', () => {
    const result = simulateActions({
      currentScore: 67,
      findings: [{ checkId: 'x', severity: 'low', status: 'fail' }],
      passportCompleteness: 50,
      actions: [{ type: 'fix', target: 'x' }],
    } as never);
    // Profile A real-world: 67 baseline → realistic estimate ~70-80, NOT 100
    expect(result.projectedScore).not.toBe(100);
    expect(result.projectedScore).toBeGreaterThanOrEqual(67);
    expect(result.projectedScore).toBeLessThanOrEqual(99);
  });
});
