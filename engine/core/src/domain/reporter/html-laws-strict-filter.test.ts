/**
 * V1-M29 / W-3: RED test — Laws tab strict profile filter + consistent disclaimer.
 *
 * Background (per /deep-e2e tab analysis 2026-04-27):
 * - Profile A (deployer/limited/general) shows Transport/LawEnforcement obligations — NOT applicable
 * - Profile C (deployer/high/finance) shows Healthcare obligations — domain leak
 * - Disclaimer present in A+C but missing in B (inconsistent)
 *
 * Specification:
 *   1. Strict filter: obligations where applies_to_role matches profile.role (or 'both')
 *      AND applies_to_risk_level includes profile.riskLevel (or 'all')
 *      AND obligation_id industry-prefix matches profile.domain (or no industry prefix)
 *   2. Industry-mismatched obligations excluded:
 *      - General: exclude OBL-FIN-*, OBL-MED-*, OBL-EDU-*, OBL-JUS-*, OBL-MKT-*, OBL-CSR-*, OBL-TRANS-*, OBL-LE-*
 *      - Finance: exclude OBL-MED-*, OBL-EDU-*, OBL-JUS-*, OBL-MKT-*, OBL-TRANS-*
 *      - Healthcare: include OBL-MED-*; exclude OBL-FIN-*, OBL-EDU-*, OBL-JUS-*, OBL-MKT-*, OBL-TRANS-*
 *   3. Disclaimer ALWAYS rendered when N obligations excluded:
 *      "+N obligations not applicable for your profile (X for high-risk, Y for healthcare, ...)"
 */

import { describe, it, expect } from 'vitest';

describe('V1-M29 W-3: Laws tab strict profile filter', () => {
  it('General domain excludes industry-specific obligations', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithMixedObligations('deployer', 'limited', 'general'));

    const lawsTab = extractTab(html, 'laws');
    // Should NOT contain healthcare/transport/law-enforcement specific items
    expect(lawsTab).not.toMatch(/Transport.*Autonomous|Law Enforcement|Medical Device|MED-\d/i);
  });

  it('Finance domain excludes Healthcare/MED obligations', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithMixedObligations('deployer', 'high', 'finance'));

    const lawsTab = extractTab(html, 'laws');
    expect(lawsTab).not.toMatch(/Healthcare.*Medical Device|MED-\d|patient/i);
  });

  it('Healthcare domain INCLUDES medical-context obligations', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithMixedObligations('provider', 'high', 'healthcare'));

    const lawsTab = extractTab(html, 'laws');
    expect(lawsTab).toMatch(/Healthcare|Medical Device|MED-\d|patient/i);
  });

  it('Disclaimer ALWAYS rendered when obligations excluded (all 3 profiles)', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    for (const params of [
      { role: 'deployer', risk: 'limited', domain: 'general' },
      { role: 'provider', risk: 'high', domain: 'healthcare' },
      { role: 'deployer', risk: 'high', domain: 'finance' },
    ]) {
      const html = generateReportHtml(buildReportWithMixedObligations(params.role, params.risk, params.domain));
      const lawsTab = extractTab(html, 'laws');
      const hasDisclaimer =
        /not\s+applicable\s+for\s+your\s+profile/i.test(lawsTab) ||
        /\+\s*\d+\s+(more|other|additional)\s+obligation/i.test(lawsTab) ||
        /excluded/i.test(lawsTab);
      expect(hasDisclaimer, `Profile ${params.role}/${params.risk}/${params.domain} missing disclaimer`).toBe(true);
    }
  });
});

function extractTab(html: string, tabId: string): string {
  const m = html.match(new RegExp(`<div class="tab-content" id="tab-${tabId}"[^>]*>([\\s\\S]*?)(?=<div class="tab-content"|</body>)`, 'i'));
  return m ? m[1] : '';
}

function buildReportWithMixedObligations(role: string, risk: string, domain: string): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  return {
    generatedAt: '2026-04-27T00:00:00Z',
    compliorVersion: '0.10.0-test',
    profile: { role, riskLevel: risk, domain, applicableArticles: ['Article 4'] },
    readiness: {
      readinessScore: 60, zone: 'yellow' as const,
      dimensions: { scan: dim(60), scanSecurity: dim(null), scanLlm: dim(null), docs: dim(60), documents: dim(60), passports: dim(70), eval: dim(null), evidence: dim(100) },
      trend: null, criticalCaps: [], daysUntilEnforcement: 100,
    },
    documents: { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, documents: [] },
    obligations: {
      total: 100, covered: 30, uncovered: 70,
      byArticle: [
        { article: 'Article 4', total: 1, covered: 1 },
        { article: 'Annex II Section A + MDR', total: 1, covered: 0 }, // Healthcare-specific
        { article: 'Article 5(1)(d)', total: 1, covered: 0 }, // Law enforcement
        { article: 'Article 79', total: 1, covered: 0 }, // Transport
        { article: 'Article 26(1)', total: 1, covered: 0 }, // General
      ],
    },
    passports: { totalAgents: 0, averageCompleteness: 0, passports: [] },
    actionPlan: { actions: [] },
    summary: { topIssues: [], overallStatus: 'in-progress' },
    findings: [],
    evalResults: null,
    fixHistory: [],
    documentContents: [],
  } as never;
}
