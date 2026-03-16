import { describe, it, expect } from 'vitest';
import { selectUncertainFindings, buildTargetedPrompts, applyTargetedResults, estimateTargetedCost } from './layer5-targeted.js';
import type { Finding } from '../../../types/common.types.js';

const makeFinding = (overrides: Partial<Finding> = {}): Finding => ({
  checkId: 'l4-kill-switch',
  type: 'fail',
  message: 'No kill switch found',
  severity: 'medium',
  confidence: 65,
  confidenceLevel: 'UNCERTAIN',
  ...overrides,
});

describe('selectUncertainFindings', () => {
  it('selects findings with confidence 50-80', () => {
    const findings = [
      makeFinding({ confidence: 30 }), // too low
      makeFinding({ confidence: 65 }), // in range
      makeFinding({ confidence: 90 }), // too high
      makeFinding({ confidence: 75 }), // in range
    ];
    const selected = selectUncertainFindings(findings);
    expect(selected.length).toBe(2);
  });

  it('respects maxFindings limit', () => {
    const findings = Array.from({ length: 30 }, (_, i) =>
      makeFinding({ checkId: `l4-test-${i}`, confidence: 60 }),
    );
    const selected = selectUncertainFindings(findings, { maxFindings: 5, budgetLimit: 0.05, confidenceMin: 50, confidenceMax: 80 });
    expect(selected.length).toBe(5);
  });

  it('treats undefined confidence as 50', () => {
    const findings = [makeFinding({ confidence: undefined })];
    const selected = selectUncertainFindings(findings);
    expect(selected.length).toBe(1);
  });
});

describe('buildTargetedPrompts', () => {
  it('builds obligation-specific prompts', () => {
    const findings = [makeFinding({ checkId: 'l4-kill-switch', file: 'src/safety.ts', line: 15 })];
    const files = new Map([['src/safety.ts', 'const killSwitch = () => process.exit(0);']]);
    const prompts = buildTargetedPrompts(findings, files);
    expect(prompts.length).toBe(1);
    expect(prompts[0]?.prompt).toContain('Art. 14(4)');
    expect(prompts[0]?.prompt).toContain('kill switch');
  });

  it('includes code context in prompt', () => {
    const findings = [makeFinding({ file: 'src/chat.ts', line: 5 })];
    const files = new Map([['src/chat.ts', 'line1\nline2\nline3\nline4\nconst x = 1;\nline6']]);
    const prompts = buildTargetedPrompts(findings, files);
    expect(prompts[0]?.prompt).toContain('line1');
    expect(prompts[0]?.contextFiles).toContain('src/chat.ts');
  });
});

describe('applyTargetedResults', () => {
  it('flips fail to pass when L5 disproves', () => {
    const findings = [makeFinding({ type: 'fail', confidence: 65 })];
    const results = [{ findingId: 'l4-kill-switch', confirmed: false, newConfidence: 90, explanation: 'This is a real kill switch', cost: 0.001 }];
    const updated = applyTargetedResults(findings, results);
    expect(updated[0]?.type).toBe('pass');
    expect(updated[0]?.confidence).toBe(90);
  });

  it('increases confidence when L5 confirms fail', () => {
    const findings = [makeFinding({ type: 'fail', confidence: 65 })];
    const results = [{ findingId: 'l4-kill-switch', confirmed: true, newConfidence: 95, explanation: 'Confirmed missing', cost: 0.001 }];
    const updated = applyTargetedResults(findings, results);
    expect(updated[0]?.type).toBe('fail');
    expect(updated[0]?.confidence).toBe(95);
  });

  it('leaves unmatched findings unchanged', () => {
    const findings = [makeFinding({ checkId: 'l4-other' })];
    const results = [{ findingId: 'l4-kill-switch', confirmed: true, newConfidence: 95, explanation: 'test', cost: 0 }];
    const updated = applyTargetedResults(findings, results);
    expect(updated[0]).toEqual(findings[0]);
  });
});

describe('estimateTargetedCost', () => {
  it('estimates cost for prompts', () => {
    const prompts = [{ findingId: 'test', prompt: 'x'.repeat(4000), contextFiles: [], estimatedTokens: 1000 }];
    const cost = estimateTargetedCost(prompts);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01); // Should be cheap
  });
});
