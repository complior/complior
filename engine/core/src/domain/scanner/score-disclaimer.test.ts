/**
 * V1-M10 T-1: Score Disclaimer Generator — RED test specs
 *
 * Tests for `buildScoreDisclaimer()` which explains what the compliance score
 * covers and doesn't cover. Pure function: ScoreBreakdown + ScanFilterContext → ScoreDisclaimer.
 */
import { describe, it, expect } from 'vitest';
import type { ScoreBreakdown, ScanFilterContext, ScoreDisclaimer } from '../../types/common.types.js';
import { buildScoreDisclaimer } from './score-disclaimer.js';

// Helper: minimal ScoreBreakdown
const makeScore = (overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown => ({
  totalScore: 80,
  zone: 'green',
  categoryScores: [],
  criticalCapApplied: false,
  totalChecks: 39,
  passedChecks: 31,
  failedChecks: 8,
  skippedChecks: 0,
  ...overrides,
});

// Helper: minimal ScanFilterContext
const makeFilterContext = (overrides: Partial<ScanFilterContext> = {}): ScanFilterContext => ({
  role: 'deployer',
  riskLevel: 'high',
  domain: 'healthcare',
  profileFound: true,
  totalObligations: 108,
  applicableObligations: 46,
  skippedByRole: 48,
  skippedByRiskLevel: 14,
  ...overrides,
});

describe('buildScoreDisclaimer', () => {
  it('returns correct coverage when profile exists with 46 applicable obligations', () => {
    const score = makeScore({ totalChecks: 39 });
    const ctx = makeFilterContext({ applicableObligations: 46 });
    // Assume 25 unique obligations are covered by 39 checks
    const coveredIds = Array.from({ length: 25 }, (_, i) => `eu-ai-act-OBL-${String(i + 1).padStart(3, '0')}`);

    const result: ScoreDisclaimer = buildScoreDisclaimer(score, ctx, coveredIds);

    expect(result.coveredObligations).toBe(25);
    expect(result.totalApplicableObligations).toBe(46);
    expect(result.coveragePercent).toBeCloseTo(54.3, 0);
    expect(result.uncoveredCount).toBe(21);
  });

  it('uses 108 as total when no profile (filterContext is null)', () => {
    const score = makeScore();
    const coveredIds = Array.from({ length: 30 }, (_, i) => `OBL-${i + 1}`);

    const result = buildScoreDisclaimer(score, null, coveredIds);

    expect(result.totalApplicableObligations).toBe(108);
    expect(result.coveredObligations).toBe(30);
    expect(result.uncoveredCount).toBe(78);
  });

  it('generates summary string mentioning check count and obligation coverage', () => {
    const score = makeScore({ totalChecks: 39 });
    const ctx = makeFilterContext({ applicableObligations: 46 });
    const coveredIds = ['OBL-001', 'OBL-002', 'OBL-003'];

    const result = buildScoreDisclaimer(score, ctx, coveredIds);

    expect(result.summary).toContain('39');   // totalChecks
    expect(result.summary).toContain('3');    // covered obligations
    expect(result.summary).toContain('46');   // total applicable
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(20);
  });

  it('includes standard limitations list', () => {
    const result = buildScoreDisclaimer(makeScore(), null, []);

    expect(result.limitations).toBeInstanceOf(Array);
    expect(result.limitations.length).toBeGreaterThanOrEqual(2);
    // Should mention automated-only and manual obligations
    const joined = result.limitations.join(' ').toLowerCase();
    expect(joined).toContain('automated');
    expect(joined).toContain('manual');
  });

  it('explains critical cap when criticalCapApplied is true', () => {
    const score = makeScore({ criticalCapApplied: true, totalScore: 40 });

    const result = buildScoreDisclaimer(score, null, []);

    expect(result.criticalCapExplanation).not.toBeNull();
    expect(result.criticalCapExplanation!).toContain('40');
    expect(result.criticalCapExplanation!.toLowerCase()).toContain('critical');
  });

  it('returns null criticalCapExplanation when cap not applied', () => {
    const score = makeScore({ criticalCapApplied: false });

    const result = buildScoreDisclaimer(score, null, []);

    expect(result.criticalCapExplanation).toBeNull();
  });
});
