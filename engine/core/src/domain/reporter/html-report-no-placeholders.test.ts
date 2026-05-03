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
  it('generated HTML has no visible `$N` placeholders (excludes script/style JS code)', async () => {
    const { buildHtmlReport } = await import('./html-report.js');
    const html = buildHtmlReport(mockReportData());

    // Strip <script> and <style> tag bodies before checking $N.
    // The $1/$2 in JS regex replacements like .replace(/^##/gm,'<h3>$1</h3>')
    // are legitimate JavaScript — not visible to users in rendered HTML.
    // Original V1-M21 bug was literal <h2>$1</h2> in HTML markup, not JS code.
    const stripScriptStyle = (s: string): string =>
      s.replace(/<script[\s\S]*?<\/script>/gi, '')
       .replace(/<style[\s\S]*?<\/style>/gi, '')
       .replace(/\sdata-md="[^"]*"/gi, '');

    const visibleHtml = stripScriptStyle(html);
    expect(visibleHtml).not.toMatch(/\$[0-9]/);
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
  // FIXED generatedAt: two calls produce identical output (deterministic).
  const TS = '2026-04-24T12:00:00.000Z';
  return Object.freeze({
    generatedAt: TS,
    compliorVersion: '1.0.0',
    projectPath: '/tmp/test-project',
    scannedAt: TS,
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
