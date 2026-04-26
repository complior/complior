/**
 * V1-M27 / HR-5: RED test — Documents tab shows ONLY profile-required docs.
 *
 * Background:
 *   User question: "Documents - документы здесь только те, что нам нужны
 *   в рамках нашего профиля?"
 *
 * Specification:
 *   - High-risk profile: shows FRIA, Risk Management, Tech Documentation, etc.
 *   - Limited-risk profile: NO FRIA (Art 27 not required), shows AI Literacy + Disclosure
 *   - Provider-only docs (Declaration of Conformity) hidden for deployer
 *   - Disclaimer about excluded docs
 *
 * Architecture:
 *   - Filter renderTabDocuments() by report.profile + doc.applies_to_*
 *   - Pure render fn
 */

import { describe, it, expect } from 'vitest';

describe('V1-M27 HR-5: Documents tab profile-filtered with disclaimer', () => {
  it('Limited-risk profile: FRIA is NOT shown (Art 27 high-risk only)', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithDocs('deployer', 'limited', 'general'));

    const docsTab = extractTab(html, 'documents');
    const showsFria = /\bFRIA\b/.test(docsTab);
    expect(showsFria).toBe(false);
  });

  it('High-risk profile: FRIA IS shown', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithDocs('provider', 'high', 'healthcare'));

    const docsTab = extractTab(html, 'documents');
    const showsFria = /\bFRIA\b|fundamental.rights/i.test(docsTab);
    expect(showsFria).toBe(true);
  });

  it('Documents tab includes disclaimer about excluded docs for current profile', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithDocs('deployer', 'limited', 'general'));

    const docsTab = extractTab(html, 'documents');
    const hasDisclaimer =
      /not\s+(required|applicable)\s+for\s+your\s+profile/i.test(docsTab) ||
      /\+\s*\d+\s+(more|other|additional)\s+(documents?|docs?)/i.test(docsTab) ||
      /excluded.*profile/i.test(docsTab);
    expect(hasDisclaimer).toBe(true);
  });
});

// ── Helpers ────────────────────────────────────────────────────────

function extractTab(html: string, tabId: string): string {
  const patterns = [
    new RegExp(`<section[^>]*id=["']?tab-${tabId}["']?[^>]*>([\\s\\S]*?)</section>`, 'i'),
    new RegExp(`<div[^>]*id=["']?${tabId}["']?[^>]*>([\\s\\S]*?)</div>`, 'i'),
    new RegExp(`data-tab=["']?${tabId}["']?[^>]*>([\\s\\S]*?)</`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return html;
}

function buildReportWithDocs(role: string, riskLevel: string, domain: string): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  return {
    generatedAt: '2026-04-26T00:00:00Z',
    compliorVersion: '0.10.0-test',
    profile: { role, riskLevel, domain, applicableArticles: ['Article 4'] },
    readiness: {
      readinessScore: 75, zone: 'yellow' as const,
      dimensions: { scan: dim(75), scanSecurity: dim(null), scanLlm: dim(null), docs: dim(60), documents: dim(60), passports: dim(70), eval: dim(null), evidence: dim(100) },
      trend: null, criticalCaps: [], daysUntilEnforcement: 100,
    },
    documents: {
      total: 14,
      byStatus: { missing: 8, scaffold: 4, draft: 1, reviewed: 1 },
      documents: [
        { docType: 'ai-literacy', article: 'Art. 4', description: 'AI Literacy Policy', outputFile: 'docs/ai-literacy.md', status: 'reviewed', scoreImpact: 5, prefilledPercent: 100, lastModified: '2026-01-01', templateFile: null },
        { docType: 'fria', article: 'Art. 27', description: 'Fundamental Rights Impact Assessment', outputFile: 'docs/fria.md', status: 'missing', scoreImpact: 10, prefilledPercent: null, lastModified: null, templateFile: 'templates/fria.md' },
        { docType: 'declaration-of-conformity', article: 'Art. 47', description: 'Declaration of Conformity', outputFile: 'docs/doc.md', status: 'missing', scoreImpact: 8, prefilledPercent: null, lastModified: null, templateFile: null },
      ],
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
