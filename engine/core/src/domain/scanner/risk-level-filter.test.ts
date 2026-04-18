/**
 * V1-M08 T-2: Risk Level Filter — RED test spec.
 *
 * Mirrors role-filter.ts pattern: findings for inapplicable risk levels
 * become type: 'skip', so they are visible but not scored.
 *
 * This file is a SPECIFICATION. The implementation (risk-level-filter.ts)
 * does not exist yet. All tests MUST fail (RED) until nodejs-dev implements it.
 */
import { describe, it, expect } from 'vitest';
import { filterFindingsByRiskLevel } from './risk-level-filter.js';
import type { Finding } from '../../types/common.types.js';

/** Helper: create a minimal finding with the given checkId and type. */
const makeFinding = (checkId: string, type: 'pass' | 'fail' = 'fail'): Finding => ({
  checkId,
  type,
  message: `Finding for ${checkId}`,
  severity: 'medium',
});

describe('filterFindingsByRiskLevel', () => {
  it('returns findings unchanged when riskLevel is null (no profile)', () => {
    const findings: readonly Finding[] = [
      makeFinding('l1-missing-fria'),
      makeFinding('l4-bare-api-call'),
      makeFinding('qms'),
    ];
    const result = filterFindingsByRiskLevel(findings, null);
    // No filtering — all remain as-is
    expect(result).toHaveLength(3);
    expect(result.every(f => f.type !== 'skip')).toBe(true);
  });

  it('skips findings whose obligations only apply to high risk when project is limited', () => {
    // 'l4-conformity-assessment' maps to obligations that require 'high' risk level
    // When project is 'limited', this finding should become type: 'skip'
    const findings: readonly Finding[] = [
      makeFinding('l4-conformity-assessment'),
      makeFinding('ai-disclosure'), // applies to all risk levels
    ];
    const result = filterFindingsByRiskLevel(findings, 'limited');
    const conformity = result.find(f => f.checkId === 'l4-conformity-assessment');
    const disclosure = result.find(f => f.checkId === 'ai-disclosure');

    expect(conformity?.type).toBe('skip');
    expect(disclosure?.type).toBe('fail'); // unchanged — applies to all
  });

  it('preserves all findings when riskLevel is high (most obligations apply)', () => {
    const findings: readonly Finding[] = [
      makeFinding('l4-conformity-assessment'),
      makeFinding('l4-data-governance'),
      makeFinding('ai-disclosure'),
    ];
    const result = filterFindingsByRiskLevel(findings, 'high');
    // All should remain as-is (high gets most checks)
    expect(result.every(f => f.type !== 'skip')).toBe(true);
  });

  it('does not modify pass findings — only fail findings become skip', () => {
    const findings: readonly Finding[] = [
      makeFinding('l4-conformity-assessment', 'pass'),
    ];
    const result = filterFindingsByRiskLevel(findings, 'limited');
    // Pass findings for inapplicable checks → still skip (consistent with role-filter)
    const conformity = result.find(f => f.checkId === 'l4-conformity-assessment');
    expect(conformity?.type).toBe('skip');
  });

  it('preserves findings with no obligation mapping (unknown checks pass through)', () => {
    const findings: readonly Finding[] = [
      makeFinding('custom-project-check'), // no obligation mapping
    ];
    const result = filterFindingsByRiskLevel(findings, 'limited');
    // No mapping → keep as-is (conservative default)
    expect(result[0]!.type).toBe('fail');
  });

  it('returns the original array reference when no changes needed', () => {
    const findings: readonly Finding[] = [
      makeFinding('ai-disclosure'), // applies to all risk levels
    ];
    const result = filterFindingsByRiskLevel(findings, 'limited');
    // Optimization: returns same array if nothing changed
    expect(result).toBe(findings);
  });

  it('skips findings for minimal risk when project is minimal', () => {
    // Some checks might only apply to high/limited
    // If a check maps to obligations that require high → skip for minimal
    const findings: readonly Finding[] = [
      makeFinding('l4-data-governance'), // typically high-risk only
      makeFinding('l1-missing-fria'),    // deployer-relevant, but check risk level too
    ];
    const result = filterFindingsByRiskLevel(findings, 'minimal');
    // Data governance obligations require high → skip
    const dataGov = result.find(f => f.checkId === 'l4-data-governance');
    expect(dataGov?.type).toBe('skip');
  });

  it('includes a descriptive skip message with risk level context', () => {
    const findings: readonly Finding[] = [
      makeFinding('l4-conformity-assessment'),
    ];
    const result = filterFindingsByRiskLevel(findings, 'limited');
    const skipped = result.find(f => f.type === 'skip');
    expect(skipped?.message).toContain('risk');
    expect(skipped?.message).toContain('limited');
  });
});
