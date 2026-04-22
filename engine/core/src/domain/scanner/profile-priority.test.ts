/**
 * V1-M10 T-3: Profile-Aware Priority Actions — RED test specs
 *
 * Tests for `buildProfileAwareTopActions()` which computes priority actions
 * that respect the project profile (role, risk level, applicable obligations).
 */
import { describe, it, expect } from 'vitest';
import type { ScanResult, ScanFilterContext, Finding, ScoreBreakdown } from '../../types/common.types.js';
import type { PriorityAction } from '../../domain/reporter/types.js';
import { buildProfileAwareTopActions } from './profile-priority.js';

const makeScore = (): ScoreBreakdown => ({
  totalScore: 65,
  zone: 'yellow',
  categoryScores: [
    { category: 'Risk Assessment', weight: 1.0, score: 40, obligationCount: 5, passedCount: 2 },
    { category: 'Transparency & Disclosure', weight: 0.75, score: 90, obligationCount: 10, passedCount: 9 },
  ],
  criticalCapApplied: false,
  totalChecks: 15,
  passedChecks: 11,
  failedChecks: 4,
  skippedChecks: 0,
});

const makeFinding = (overrides: Partial<Finding> = {}): Finding => ({
  checkId: 'l1-fria-missing',
  type: 'fail',
  message: 'FRIA document not found',
  severity: 'high',
  obligationId: 'eu-ai-act-OBL-028',
  articleReference: 'Art. 27',
  fix: 'Generate FRIA with complior fix --doc fria',
  ...overrides,
});

const makeFilterContext = (overrides: Partial<ScanFilterContext> = {}): ScanFilterContext => ({
  role: 'deployer',
  riskLevel: 'high',
  domain: 'healthcare',
  profileFound: true,
  totalObligations: 108,
  applicableObligations: 46,
  skippedByRole: 48,
  skippedByRiskLevel: 14,
  skippedByDomain: 0,
  ...overrides,
});

const makeScanResult = (findings: Finding[], filterContext?: ScanFilterContext): ScanResult => ({
  score: makeScore(),
  findings,
  projectPath: '/tmp/test-project',
  scannedAt: new Date().toISOString(),
  duration: 150,
  filesScanned: 10,
  filterContext: filterContext ?? makeFilterContext(),
});

describe('buildProfileAwareTopActions', () => {
  it('returns at most 5 actions (increased from 3)', () => {
    const findings: Finding[] = Array.from({ length: 10 }, (_, i) =>
      makeFinding({
        checkId: `l1-check-${i}`,
        severity: i < 3 ? 'critical' : 'high',
        obligationId: `eu-ai-act-OBL-${String(i + 1).padStart(3, '0')}`,
      }),
    );
    const result = makeScanResult(findings);

    const actions: PriorityAction[] = buildProfileAwareTopActions(result, result.filterContext!);

    expect(actions.length).toBeLessThanOrEqual(5);
    expect(actions.length).toBeGreaterThan(0);
  });

  it('assigns rank starting from 1 in priority order', () => {
    const findings: Finding[] = [
      makeFinding({ checkId: 'c1', severity: 'critical' }),
      makeFinding({ checkId: 'c2', severity: 'low' }),
      makeFinding({ checkId: 'c3', severity: 'high' }),
    ];
    const result = makeScanResult(findings);

    const actions = buildProfileAwareTopActions(result, result.filterContext!);

    expect(actions[0].rank).toBe(1);
    if (actions.length > 1) expect(actions[1].rank).toBe(2);
    // Critical should rank before low
    expect(actions[0].severity).not.toBe('low');
  });

  it('returns empty array when no fail findings exist', () => {
    const findings: Finding[] = [
      makeFinding({ checkId: 'c1', type: 'pass' }),
      makeFinding({ checkId: 'c2', type: 'pass' }),
    ];
    const result = makeScanResult(findings);

    const actions = buildProfileAwareTopActions(result, result.filterContext!);

    expect(actions).toHaveLength(0);
  });

  it('still works when filterContext is null (no profile)', () => {
    const findings: Finding[] = [
      makeFinding({ checkId: 'c1', severity: 'high' }),
      makeFinding({ checkId: 'c2', severity: 'medium' }),
    ];
    const result = makeScanResult(findings, undefined);
    // Override to null
    const resultNoProfile: ScanResult = { ...result, filterContext: undefined };

    const actions = buildProfileAwareTopActions(resultNoProfile, null);

    // Should still return actions, just without profile filtering
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].rank).toBe(1);
  });
});
