/**
 * V1-M29 / W-4: RED test — Documents tab strict profile-required filter.
 *
 * Background (per /deep-e2e tab analysis 2026-04-27):
 * - All 14 doc types shown for all 3 profiles regardless of profile
 * - FRIA visible for Profile A (limited risk) — Art. 27 doesn't require FRIA for limited
 * - Disclaimer present in A+C but NOT in B (inconsistent)
 *
 * Specification:
 *   1. FRIA only shown for high-risk profiles (riskLevel='high' or 'unacceptable')
 *   2. Declaration-of-conformity only for provider role
 *   3. ISO 42001-related docs already removed (V1-M22 C-3) — verify still absent
 *   4. Disclaimer always present when N docs excluded
 */

import { describe, it, expect } from 'vitest';

describe('V1-M29 W-4: Documents tab strict profile-required filter', () => {
  it('Limited-risk profile: FRIA NOT shown', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReport('deployer', 'limited', 'general'));
    const docsTab = extractTab(html, 'documents');
    expect(docsTab).not.toMatch(/\bFRIA\b|fria\.md|fundamental.rights/i);
  });

  it('High-risk profile: FRIA IS shown', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReport('provider', 'high', 'healthcare'));
    const docsTab = extractTab(html, 'documents');
    expect(docsTab).toMatch(/\bFRIA\b|fundamental.rights/i);
  });

  it('Deployer role: declaration-of-conformity NOT shown (provider-only)', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReport('deployer', 'limited', 'general'));
    const docsTab = extractTab(html, 'documents');
    expect(docsTab).not.toMatch(/declaration.of.conformity|conformity.declaration/i);
  });

  it('Provider role: declaration-of-conformity IS shown', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReport('provider', 'high', 'healthcare'));
    const docsTab = extractTab(html, 'documents');
    expect(docsTab).toMatch(/declaration.of.conformity|conformity.declaration/i);
  });

  it('Disclaimer always present when documents excluded (all 3 profiles)', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    for (const params of [
      { role: 'deployer', risk: 'limited', domain: 'general' },
      { role: 'provider', risk: 'high', domain: 'healthcare' },
      { role: 'deployer', risk: 'high', domain: 'finance' },
    ]) {
      const html = generateReportHtml(buildReport(params.role, params.risk, params.domain));
      const docsTab = extractTab(html, 'documents');
      const hasDisclaimer =
        /not\s+(required|applicable)\s+for\s+your\s+profile/i.test(docsTab) ||
        /\+\s*\d+\s+(more|other|additional)\s+(documents?|docs?)/i.test(docsTab) ||
        /excluded.*profile/i.test(docsTab);
      expect(hasDisclaimer, `Profile ${params.role}/${params.risk}/${params.domain} missing docs disclaimer`).toBe(true);
    }
  });

  it('No iso42001 doc types (V1-M22 C-3 invariant — verify still removed)', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReport('provider', 'high', 'healthcare'));
    const docsTab = extractTab(html, 'documents');
    expect(docsTab).not.toMatch(/iso42001|iso-42001|ISO 42001/i);
  });
});

function extractTab(html: string, tabId: string): string {
  const m = html.match(new RegExp(`<div class="tab-content" id="tab-${tabId}"[^>]*>([\\s\\S]*?)(?=<div class="tab-content"|</body>)`, 'i'));
  return m ? m[1] : '';
}

function buildReport(role: string, risk: string, domain: string): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  // 14 doc types — same as production
  const allDocs = [
    { docType: 'ai-literacy', article: 'Art. 4', description: 'AI Literacy Policy' },
    { docType: 'art5-screening', article: 'Art. 5', description: 'Art. 5 Screening' },
    { docType: 'technical-documentation', article: 'Art. 11', description: 'Tech Documentation' },
    { docType: 'incident-report', article: 'Art. 73', description: 'Incident Report' },
    { docType: 'declaration-of-conformity', article: 'Art. 47', description: 'Declaration of Conformity' },
    { docType: 'monitoring-policy', article: 'Art. 72', description: 'Monitoring Policy' },
    { docType: 'fria', article: 'Art. 27', description: 'Fundamental Rights Impact Assessment' },
    { docType: 'worker-notification', article: 'Art. 26(7)', description: 'Worker Notification' },
    { docType: 'risk-management', article: 'Art. 9', description: 'Risk Management' },
    { docType: 'data-governance', article: 'Art. 10', description: 'Data Governance' },
    { docType: 'qms', article: 'Art. 17', description: 'QMS' },
    { docType: 'instructions-for-use', article: 'Art. 13', description: 'Instructions for Use' },
    { docType: 'gpai-transparency', article: 'Art. 53', description: 'GPAI Transparency' },
    { docType: 'gpai-systemic-risk', article: 'Art. 51', description: 'GPAI Systemic Risk' },
  ];
  return {
    generatedAt: '2026-04-27T00:00:00Z',
    compliorVersion: '0.10.0-test',
    profile: { role, riskLevel: risk, domain, applicableArticles: ['Article 4'] },
    readiness: {
      readinessScore: 60, zone: 'yellow' as const,
      dimensions: { scan: dim(60), scanSecurity: dim(null), scanLlm: dim(null), docs: dim(50), documents: dim(50), passports: dim(70), eval: dim(null), evidence: dim(100) },
      trend: null, criticalCaps: [], daysUntilEnforcement: 100,
    },
    documents: {
      total: 14, byStatus: { missing: 14, scaffold: 0, draft: 0, reviewed: 0 },
      documents: allDocs.map((d) => ({
        ...d,
        outputFile: `docs/${d.docType}.md`,
        status: 'missing',
        scoreImpact: 5,
        prefilledPercent: null,
        lastModified: null,
        templateFile: null,
      })),
    },
    obligations: { total: 108, covered: 30, uncovered: 78, byArticle: [] },
    passports: { totalAgents: 0, averageCompleteness: 0, passports: [] },
    actionPlan: { actions: [] },
    summary: { topIssues: [], overallStatus: 'in-progress' },
    findings: [],
    evalResults: null,
    fixHistory: [],
    documentContents: [],
  } as never;
}
