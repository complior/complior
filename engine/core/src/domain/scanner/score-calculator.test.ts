import { describe, it, expect } from 'vitest';
import { calculateScore, calculateScoreDiff, getZone } from './score-calculator.js';
import type { CheckResult } from '../../types/common.types.js';
import type { ScoringData } from '../../data/schemas.js';

// Minimal scoring data matching the real structure
const makeScoringData = (overrides?: Partial<ScoringData>): ScoringData => ({
  regulation_id: 'eu-ai-act',
  total_obligations: 108,
  critical_obligations: 37,
  critical_obligation_ids: [
    'eu-ai-act-OBL-002',
    'eu-ai-act-OBL-003',
    'eu-ai-act-OBL-005',
    'eu-ai-act-OBL-008',
  ],
  critical_obligations_note: 'Critical cap at 40%',
  weighted_categories: [
    {
      category: 'transparency',
      weight: 17,
      weight_reasoning: 'Publicly visible obligations',
      obligations_in_category: ['eu-ai-act-OBL-007', 'eu-ai-act-OBL-015'],
    },
    {
      category: 'documentation',
      weight: 13,
      weight_reasoning: 'Evidence for regulators',
      obligations_in_category: ['eu-ai-act-OBL-005', 'eu-ai-act-OBL-019'],
    },
    {
      category: 'technical_safeguards',
      weight: 9,
      weight_reasoning: 'Logging and oversight',
      obligations_in_category: ['eu-ai-act-OBL-006', 'eu-ai-act-OBL-008'],
    },
    {
      category: 'organizational',
      weight: 9,
      weight_reasoning: 'QMS and training',
      obligations_in_category: ['eu-ai-act-OBL-001', 'eu-ai-act-OBL-011'],
    },
  ],
  score_formula: 'weighted average',
  score_interpretation: { for_deployers: '', for_providers: '' },
  thresholds: {
    red: { range: '0-49%', label: 'Critical', description: '', action: '' },
    yellow: { range: '50-79%', label: 'Partial', description: '', action: '' },
    green: { range: '80-100%', label: 'Compliant', description: '', action: '' },
  },
  minimum_for_certificate: 85,
  certificate_additional_requirements: [],
  score_update_triggers: [],
  domain_specific_categories: [],
  ...overrides,
});

// Helper: create pass check
const pass = (checkId: string): CheckResult => ({
  type: 'pass',
  checkId,
  message: `${checkId} passed`,
});

// Helper: create fail check
const fail = (checkId: string, obligationId?: string): CheckResult => ({
  type: 'fail',
  checkId,
  message: `${checkId} failed`,
  severity: 'high',
  ...(obligationId !== undefined ? { obligationId } : {}),
});

// Helper: create skip check
const skip = (checkId: string): CheckResult => ({
  type: 'skip',
  checkId,
  reason: `${checkId} not applicable`,
});

describe('getZone', () => {
  it('returns red for scores 0-49', () => {
    expect(getZone(0)).toBe('red');
    expect(getZone(25)).toBe('red');
    expect(getZone(49)).toBe('red');
    expect(getZone(49.99)).toBe('red');
  });

  it('returns yellow for scores 50-79', () => {
    expect(getZone(50)).toBe('yellow');
    expect(getZone(65)).toBe('yellow');
    expect(getZone(79)).toBe('yellow');
    expect(getZone(79.99)).toBe('yellow');
  });

  it('returns green for scores 80-100', () => {
    expect(getZone(80)).toBe('green');
    expect(getZone(90)).toBe('green');
    expect(getZone(100)).toBe('green');
  });
});

describe('calculateScore', () => {
  const scoringData = makeScoringData();

  it('returns 100% green for all-pass checks', () => {
    const checks: readonly CheckResult[] = [
      pass('ai-disclosure'),
      pass('content-marking'),
      pass('interaction-logging'),
      pass('ai-literacy'),
      pass('gpai-transparency'),
      pass('compliance-metadata'),
      pass('documentation'),
    ];

    const result = calculateScore(checks, scoringData);

    expect(result.totalScore).toBe(100);
    expect(result.zone).toBe('green');
    expect(result.criticalCapApplied).toBe(false);
    expect(result.passedChecks).toBe(7);
    expect(result.failedChecks).toBe(0);
    expect(result.skippedChecks).toBe(0);
    expect(result.totalChecks).toBe(7);
  });

  it('returns 0% red for all-fail checks', () => {
    const checks: readonly CheckResult[] = [
      fail('ai-disclosure'),
      fail('content-marking'),
      fail('interaction-logging'),
      fail('ai-literacy'),
      fail('gpai-transparency'),
      fail('compliance-metadata'),
      fail('documentation'),
    ];

    const result = calculateScore(checks, scoringData);

    expect(result.totalScore).toBe(0);
    expect(result.zone).toBe('red');
    expect(result.passedChecks).toBe(0);
    expect(result.failedChecks).toBe(7);
  });

  it('calculates correct weighted score for mixed pass/fail', () => {
    // transparency: ai-disclosure pass, content-marking fail → 50%
    // documentation: gpai-transparency pass, compliance-metadata pass, documentation pass → 100%
    // technical_safeguards: interaction-logging fail → 0%
    // organizational: ai-literacy pass → 100%
    const checks: readonly CheckResult[] = [
      pass('ai-disclosure'),
      fail('content-marking'),
      fail('interaction-logging'),
      pass('ai-literacy'),
      pass('gpai-transparency'),
      pass('compliance-metadata'),
      pass('documentation'),
    ];

    const result = calculateScore(checks, scoringData);

    // Weighted: (50*17 + 100*13 + 0*9 + 100*9) / (17+13+9+9) = (850+1300+0+900)/48 = 3050/48 ≈ 63.54
    expect(result.totalScore).toBeCloseTo(63.54, 1);
    expect(result.zone).toBe('yellow');
    expect(result.criticalCapApplied).toBe(false);
    expect(result.categoryScores).toHaveLength(4);

    const transparency = result.categoryScores.find((c) => c.category === 'transparency');
    expect(transparency?.score).toBe(50);
    expect(transparency?.passedCount).toBe(1);
    expect(transparency?.obligationCount).toBe(2);

    const docs = result.categoryScores.find((c) => c.category === 'documentation');
    expect(docs?.score).toBe(100);
  });

  it('applies critical cap when critical obligation fails (by obligationId)', () => {
    // All pass except one fail with critical obligationId
    const checks: readonly CheckResult[] = [
      pass('ai-disclosure'),
      pass('content-marking'),
      pass('interaction-logging'),
      pass('ai-literacy'),
      pass('gpai-transparency'),
      pass('compliance-metadata'),
      fail('some-check', 'eu-ai-act-OBL-002'), // critical obligation
    ];

    // 'some-check' with obligationId 'eu-ai-act-OBL-002' doesn't map to any category
    // But the critical cap should still apply
    const result = calculateScore(checks, scoringData);

    expect(result.criticalCapApplied).toBe(true);
    expect(result.totalScore).toBeLessThanOrEqual(40);
    expect(result.zone).toBe('red');
  });

  it('applies critical cap when critical obligation fails (by checkId)', () => {
    // Use scoring data where a checkId is in critical_obligation_ids
    const customScoring = makeScoringData({
      critical_obligation_ids: ['interaction-logging'],
    });

    const checks: readonly CheckResult[] = [
      pass('ai-disclosure'),
      pass('content-marking'),
      fail('interaction-logging'), // this checkId is critical
      pass('ai-literacy'),
      pass('gpai-transparency'),
      pass('compliance-metadata'),
      pass('documentation'),
    ];

    const result = calculateScore(checks, customScoring);

    expect(result.criticalCapApplied).toBe(true);
    expect(result.totalScore).toBeLessThanOrEqual(40);
    expect(result.zone).toBe('red');
  });

  it('returns 100% green for all-skip checks', () => {
    const checks: readonly CheckResult[] = [
      skip('ai-disclosure'),
      skip('content-marking'),
      skip('interaction-logging'),
    ];

    const result = calculateScore(checks, scoringData);

    expect(result.totalScore).toBe(100);
    expect(result.zone).toBe('green');
    expect(result.skippedChecks).toBe(3);
    expect(result.passedChecks).toBe(0);
    expect(result.failedChecks).toBe(0);
    expect(result.categoryScores).toHaveLength(0);
  });

  it('returns 100% green for empty checks', () => {
    const result = calculateScore([], scoringData);

    expect(result.totalScore).toBe(100);
    expect(result.zone).toBe('green');
    expect(result.totalChecks).toBe(0);
    expect(result.categoryScores).toHaveLength(0);
  });

  it('matches checks by obligationId to category', () => {
    // Use obligationId matching instead of checkId fallback
    const checks: readonly CheckResult[] = [
      fail('custom-check-1', 'eu-ai-act-OBL-007'), // transparency category
      pass('custom-check-2'), // no mapping, excluded
    ];

    const result = calculateScore(checks, scoringData);

    expect(result.categoryScores).toHaveLength(1);
    expect(result.categoryScores[0].category).toBe('transparency');
    expect(result.categoryScores[0].score).toBe(0);
  });

  it('skips categories with no matching checks', () => {
    // Only transparency checks
    const checks: readonly CheckResult[] = [
      pass('ai-disclosure'),
      pass('content-marking'),
    ];

    const result = calculateScore(checks, scoringData);

    // Only transparency should be active
    expect(result.categoryScores).toHaveLength(1);
    expect(result.categoryScores[0].category).toBe('transparency');
    expect(result.totalScore).toBe(100);
  });
});

describe('calculateScoreDiff', () => {
  const scoringData = makeScoringData();

  it('detects improvement', () => {
    const before = calculateScore(
      [fail('ai-disclosure'), fail('content-marking'), pass('interaction-logging')],
      scoringData,
    );
    const after = calculateScore(
      [pass('ai-disclosure'), pass('content-marking'), pass('interaction-logging')],
      scoringData,
    );

    const diff = calculateScoreDiff(before, after);

    expect(diff.before).toBe(before.totalScore);
    expect(diff.after).toBe(after.totalScore);
    expect(diff.delta).toBeGreaterThan(0);
    expect(diff.improved).toContain('transparency');
    expect(diff.degraded).toHaveLength(0);
  });

  it('detects degradation', () => {
    const before = calculateScore(
      [pass('ai-disclosure'), pass('content-marking'), pass('interaction-logging')],
      scoringData,
    );
    const after = calculateScore(
      [fail('ai-disclosure'), fail('content-marking'), pass('interaction-logging')],
      scoringData,
    );

    const diff = calculateScoreDiff(before, after);

    expect(diff.delta).toBeLessThan(0);
    expect(diff.degraded).toContain('transparency');
    expect(diff.improved).toHaveLength(0);
  });

  it('detects both improved and degraded categories', () => {
    const before = calculateScore(
      [pass('ai-disclosure'), pass('content-marking'), fail('interaction-logging'), pass('ai-literacy')],
      scoringData,
    );
    const after = calculateScore(
      [fail('ai-disclosure'), fail('content-marking'), pass('interaction-logging'), pass('ai-literacy')],
      scoringData,
    );

    const diff = calculateScoreDiff(before, after);

    expect(diff.improved).toContain('technical_safeguards');
    expect(diff.degraded).toContain('transparency');
  });

  it('returns zero delta when scores are identical', () => {
    const checks: readonly CheckResult[] = [
      pass('ai-disclosure'),
      pass('content-marking'),
    ];
    const breakdown = calculateScore(checks, scoringData);

    const diff = calculateScoreDiff(breakdown, breakdown);

    expect(diff.delta).toBe(0);
    expect(diff.improved).toHaveLength(0);
    expect(diff.degraded).toHaveLength(0);
  });
});
