/**
 * V1-M22 / A-2 (B-2): RED test — HTML report must have zero unsubstituted template placeholders.
 *
 * Background:
 *   V1-M21 deep E2E found literal `<h2>$1</h2>` and `<h3>$1</h3>` in generated
 *   HTML report (near "Past Due / Enforcement Countdown" sections). Template
 *   substitution (likely `sed`-based) failed silently.
 *
 * Specification:
 *   - Generated HTML contains 0 instances of `$1`, `$2`, ... `$9`
 *   - No `{{placeholder}}` mustache-style leftovers either
 *   - No `__PLACEHOLDER__` underscore markers
 *
 * Architecture requirements:
 *   - Pure function
 *   - Deterministic
 *   - Object.freeze on result
 */

import { describe, it, expect } from 'vitest';

describe('V1-M22 / A-2: HTML report no placeholder leakage', () => {
  it('generated HTML has no `$N` placeholders', async () => {
    const { buildHtmlReport } = await import('./html-report.js');
    const html = buildHtmlReport(mockReportData());

    expect(html).not.toMatch(/\$[0-9]/);
  });

  it('generated HTML has no `{{placeholder}}` leftovers', async () => {
    const { buildHtmlReport } = await import('./html-report.js');
    const html = buildHtmlReport(mockReportData());

    expect(html).not.toMatch(/\{\{[A-Za-z_][A-Za-z0-9_]*\}\}/);
  });

  it('generated HTML has no `__PLACEHOLDER__` markers', async () => {
    const { buildHtmlReport } = await import('./html-report.js');
    const html = buildHtmlReport(mockReportData());

    expect(html).not.toMatch(/__[A-Z_]{3,}__/);
  });

  it('buildHtmlReport returns frozen result', async () => {
    const { buildHtmlReport } = await import('./html-report.js');
    const html = buildHtmlReport(mockReportData());

    // String primitives are inherently immutable; check function purity instead
    const html2 = buildHtmlReport(mockReportData());
    expect(html).toStrictEqual(html2);
  });
});

function mockReportData(): unknown {
  // Minimal stub — real shape determined by html-report.ts signature.
  // Test will fail to compile until dev creates html-report.ts with a typed API.
  return Object.freeze({
    projectPath: '/tmp/test-project',
    scannedAt: '2026-04-24T12:00:00Z',
    score: { totalScore: 72, zone: 'yellow' },
    findings: [],
    filterContext: {
      role: 'provider',
      riskLevel: 'high',
      domain: 'healthcare',
      profileFound: true,
      totalTests: 100,
      applicableTests: 80,
      skippedByRole: 10,
      skippedByRiskLevel: 5,
      skippedByDomain: 5,
    },
    obligations: [],
    disclaimer: { summary: 'test', limitations: [] },
  });
}
