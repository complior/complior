import { describe, it, expect } from 'vitest';
import { deriveDocStatusFromFindings, buildScanSummary } from './scan-to-compliance.js';
import type { Finding } from '../../types/common.types.js';

// --- Helpers ---

const SCAN_DATE = '2026-03-26T10:00:00.000Z';

const makeFinding = (checkId: string, type: 'pass' | 'fail' | 'skip' = 'pass'): Finding => ({
  checkId,
  type,
  message: `Check ${checkId}`,
  severity: 'medium',
});

// --- Tests ---

describe('deriveDocStatusFromFindings', () => {
  it('sets all doc fields to true when all checks pass', () => {
    const findings = [
      makeFinding('fria', 'pass'),
      makeFinding('risk-management', 'pass'),
      makeFinding('data-governance', 'pass'),
      makeFinding('technical-documentation', 'pass'),
      makeFinding('declaration-of-conformity', 'pass'),
      makeFinding('art5-screening', 'pass'),
      makeFinding('instructions-for-use', 'pass'),
    ];

    const result = deriveDocStatusFromFindings(findings, '2026-03-26T10:00:00.000Z');

    expect(result.fria_completed).toBe(true);
    expect(result.risk_management?.documented).toBe(true);
    expect(result.data_governance?.documented).toBe(true);
    expect(result.technical_documentation?.documented).toBe(true);
    expect(result.declaration_of_conformity?.documented).toBe(true);
    expect(result.art5_screening?.completed).toBe(true);
    expect(result.instructions_for_use?.documented).toBe(true);
  });

  it('sets doc fields to false when checks fail', () => {
    const findings = [
      makeFinding('fria', 'fail'),
      makeFinding('risk-management', 'fail'),
      makeFinding('technical-documentation', 'fail'),
    ];

    const result = deriveDocStatusFromFindings(findings, '2026-03-26T10:00:00.000Z');

    expect(result.fria_completed).toBe(false);
    expect(result.risk_management?.documented).toBe(false);
    expect(result.technical_documentation?.documented).toBe(false);
  });

  it('handles mixed pass/fail results', () => {
    const findings = [
      makeFinding('fria', 'pass'),
      makeFinding('risk-management', 'fail'),
      makeFinding('technical-documentation', 'pass'),
      makeFinding('art5-screening', 'fail'),
    ];

    const result = deriveDocStatusFromFindings(findings, '2026-03-26T10:00:00.000Z');

    expect(result.fria_completed).toBe(true);
    expect(result.risk_management?.documented).toBe(false);
    expect(result.technical_documentation?.documented).toBe(true);
    expect(result.art5_screening?.completed).toBe(false);
  });

  it('ignores unknown checkIds', () => {
    const findings = [
      makeFinding('unknown-check', 'pass'),
      makeFinding('some-other-check', 'fail'),
    ];

    const result = deriveDocStatusFromFindings(findings, '2026-03-26T10:00:00.000Z');

    expect(Object.keys(result)).toHaveLength(0);
  });

  it('matches prefixed checkIds (l1-fria, l2-risk-management)', () => {
    const findings = [
      makeFinding('l1-fria', 'pass'),
      makeFinding('l2-risk-management', 'fail'),
    ];

    const result = deriveDocStatusFromFindings(findings, '2026-03-26T10:00:00.000Z');

    expect(result.fria_completed).toBe(true);
    expect(result.risk_management?.documented).toBe(false);
  });

  it('L2 fail overrides L1 pass for same document (scaffold detection)', () => {
    const findings = [
      makeFinding('l1-fria', 'pass'),       // L1: file exists
      makeFinding('l2-fria', 'fail'),        // L2: content is shallow/scaffold
      makeFinding('l1-risk-management', 'pass'),
      makeFinding('l2-risk-management', 'fail'),
    ];

    const result = deriveDocStatusFromFindings(findings, '2026-03-26T10:00:00.000Z');

    // L2 fail should win over L1 pass
    expect(result.fria_completed).toBe(false);
    expect(result.risk_management?.documented).toBe(false);
  });

  it('returns empty when no findings', () => {
    const result = deriveDocStatusFromFindings([]);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('includes date in nested doc fields', () => {
    const findings = [makeFinding('technical-documentation', 'pass')];
    const result = deriveDocStatusFromFindings(findings, '2026-03-26T10:00:00.000Z');

    expect(result.technical_documentation?.last_update).toBe('2026-03-26T10:00:00.000Z');
  });
});

describe('buildScanSummary', () => {
  it('produces correct totals from findings array', () => {
    const findings = [
      makeFinding('l1-fria', 'pass'),
      makeFinding('l1-risk-management', 'fail'),
      makeFinding('l2-data-governance', 'pass'),
      makeFinding('l3-banned-package', 'fail'),
      makeFinding('l4-disclosure-pattern', 'pass'),
    ];
    const summary = buildScanSummary(findings, SCAN_DATE);

    expect(summary.total_checks).toBe(5);
    expect(summary.passed).toBe(3);
    expect(summary.failed).toBe(2);
    expect(summary.skipped).toBe(0);
    expect(summary.scan_date).toBe(SCAN_DATE);
  });

  it('groups findings by category', () => {
    const findings = [
      makeFinding('l1-fria', 'pass'),
      makeFinding('l1-risk-management', 'fail'),
      makeFinding('l1-technical-documentation', 'pass'),
    ];
    const summary = buildScanSummary(findings, SCAN_DATE);

    expect(summary.by_category['fria']).toEqual({ passed: 1, failed: 0 });
    expect(summary.by_category['risk-management']).toEqual({ passed: 0, failed: 1 });
    expect(summary.by_category['technical-documentation']).toEqual({ passed: 1, failed: 0 });
  });

  it('preserves multi-segment category names (declaration-of-conformity, instructions-for-use)', () => {
    const findings = [
      makeFinding('declaration-of-conformity', 'fail'),
      makeFinding('instructions-for-use', 'fail'),
      makeFinding('art5-screening', 'pass'),
    ];
    const summary = buildScanSummary(findings, SCAN_DATE);

    expect(summary.by_category['declaration-of-conformity']).toEqual({ passed: 0, failed: 1 });
    expect(summary.by_category['instructions-for-use']).toEqual({ passed: 0, failed: 1 });
    expect(summary.by_category['art5-screening']).toEqual({ passed: 1, failed: 0 });
    // Must NOT truncate to "declaration-of" or "instructions-for"
    expect(summary.by_category['declaration-of']).toBeUndefined();
    expect(summary.by_category['instructions-for']).toBeUndefined();
  });

  it('collects failed check IDs', () => {
    const findings = [
      makeFinding('l1-fria', 'pass'),
      makeFinding('l3-banned-package', 'fail'),
      makeFinding('l4-no-disclosure', 'fail'),
    ];
    const summary = buildScanSummary(findings, SCAN_DATE);

    expect(summary.failed_checks).toEqual(['l3-banned-package', 'l4-no-disclosure']);
  });

  it('handles empty findings', () => {
    const summary = buildScanSummary([], SCAN_DATE);

    expect(summary.total_checks).toBe(0);
    expect(summary.passed).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.by_category).toEqual({});
    expect(summary.failed_checks).toEqual([]);
  });

  it('handles skipped findings', () => {
    const findings = [
      makeFinding('l1-fria', 'skip'),
      makeFinding('l2-data-governance', 'pass'),
    ];
    const summary = buildScanSummary(findings, SCAN_DATE);

    expect(summary.skipped).toBe(1);
    expect(summary.passed).toBe(1);
  });
});
