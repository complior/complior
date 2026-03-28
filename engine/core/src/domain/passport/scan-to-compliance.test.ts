import { describe, it, expect } from 'vitest';
import { deriveDocStatusFromFindings, buildScanSummary, buildDocQualitySummary } from './scan-to-compliance.js';
import type { Finding } from '../../types/common.types.js';
import type { DocQualityLevel } from '../../types/passport.types.js';

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

// --- doc_quality propagation ---

const makeFindingWithQuality = (
  checkId: string,
  type: 'pass' | 'fail' | 'skip',
  docQuality?: DocQualityLevel,
): Finding => ({
  checkId,
  type,
  message: `Check ${checkId}`,
  severity: 'medium',
  docQuality,
});

describe('deriveDocStatusFromFindings with docQuality', () => {
  it('propagates docQuality from L2 findings to compliance block', () => {
    const findings = [
      makeFindingWithQuality('l2-risk-management', 'fail', 'scaffold'),
      makeFindingWithQuality('l2-technical-documentation', 'pass', 'draft'),
      makeFindingWithQuality('l2-data-governance', 'pass', 'reviewed'),
    ];

    const result = deriveDocStatusFromFindings(findings, SCAN_DATE);

    expect(result.risk_management?.doc_quality).toBe('scaffold');
    expect(result.technical_documentation?.doc_quality).toBe('draft');
    expect(result.data_governance?.doc_quality).toBe('reviewed');
  });

  it('defaults docQuality to draft for pass findings without explicit quality', () => {
    const findings = [makeFinding('risk-management', 'pass')];
    const result = deriveDocStatusFromFindings(findings, SCAN_DATE);
    expect(result.risk_management?.doc_quality).toBe('draft');
  });

  it('defaults docQuality to none for fail findings without explicit quality', () => {
    const findings = [makeFinding('risk-management', 'fail')];
    const result = deriveDocStatusFromFindings(findings, SCAN_DATE);
    expect(result.risk_management?.doc_quality).toBe('none');
  });
});

describe('N1: fria_completed false for scaffold quality', () => {
  it('fria_completed is false when docQuality is scaffold (auto-generated)', () => {
    const findings = [
      makeFindingWithQuality('l2-fria', 'pass', 'scaffold'),
    ];
    const result = deriveDocStatusFromFindings(findings, SCAN_DATE);
    expect(result.fria_completed).toBe(false);
  });

  it('fria_completed is false when docQuality is none', () => {
    const findings = [
      makeFindingWithQuality('fria', 'pass', 'none'),
    ];
    const result = deriveDocStatusFromFindings(findings, SCAN_DATE);
    expect(result.fria_completed).toBe(false);
  });

  it('fria_completed is true when docQuality is draft', () => {
    const findings = [
      makeFindingWithQuality('fria', 'pass', 'draft'),
    ];
    const result = deriveDocStatusFromFindings(findings, SCAN_DATE);
    expect(result.fria_completed).toBe(true);
  });

  it('fria_completed is true when docQuality is reviewed', () => {
    const findings = [
      makeFindingWithQuality('fria', 'pass', 'reviewed'),
    ];
    const result = deriveDocStatusFromFindings(findings, SCAN_DATE);
    expect(result.fria_completed).toBe(true);
  });
});

describe('buildDocQualitySummary', () => {
  it('counts quality levels across all doc fields', () => {
    const compliance = {
      risk_management: { documented: true, doc_quality: 'reviewed' as const },
      data_governance: { documented: true, doc_quality: 'draft' as const },
      technical_documentation: { documented: false, doc_quality: 'scaffold' as const },
      declaration_of_conformity: { documented: false, doc_quality: 'none' as const },
      art5_screening: { completed: true, doc_quality: 'draft' as const },
      instructions_for_use: { documented: true, doc_quality: 'reviewed' as const },
    };

    const summary = buildDocQualitySummary(compliance);

    expect(summary).toEqual({
      none: 1,
      scaffold: 1,
      draft: 2,
      reviewed: 2,
    });
  });

  it('counts missing doc fields as none', () => {
    const summary = buildDocQualitySummary({});

    expect(summary).toEqual({
      none: 6,
      scaffold: 0,
      draft: 0,
      reviewed: 0,
    });
  });

  it('counts fields without doc_quality as none', () => {
    const compliance = {
      risk_management: { documented: true },
      data_governance: { documented: true },
    };

    const summary = buildDocQualitySummary(compliance);

    // 2 fields without doc_quality + 4 missing fields = 6 none
    expect(summary?.none).toBe(6);
  });
});
