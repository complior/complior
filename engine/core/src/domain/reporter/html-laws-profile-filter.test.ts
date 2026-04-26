/**
 * V1-M27 / HR-4: RED test — Laws tab shows ONLY profile-applicable obligations.
 *
 * Background:
 *   User question: "Laws - отображены все облишейшины закона или только те,
 *   под которые подпадает компания по своему профилю?"
 *
 * Specification:
 *   - For deployer/limited/general profile: show ONLY obligations where
 *     applies_to_role includes "deployer" OR "both" AND
 *     applies_to_risk_level includes "limited" OR "all"
 *   - Provider-only obligations (e.g. conformity assessment) HIDDEN
 *   - High-risk-only obligations HIDDEN for limited risk
 *   - Industry-specific obligations (FIN/MED/EDU/JUS/MKT/CSR) HIDDEN for general
 *   - Disclaimer banner: "+N obligations not applicable for your profile.
 *     X for high-risk providers, Y for healthcare deployers, ..."
 *
 * Architecture:
 *   - Filter in renderTabLaws() using report.profile + obligations.applicable_to_*
 *   - Pure render fn, no I/O
 */

import { describe, it, expect } from 'vitest';

describe('V1-M27 HR-4: Laws tab profile-filtered with disclaimer', () => {
  it('Deployer/limited/general profile: provider-only obligations are HIDDEN', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithLawsProfile('deployer', 'limited', 'general'));

    // Provider-only obligations like "Conformity Assessment" (Art 43) should NOT appear in Laws tab
    // Approximation: check that "OBL-PROVIDER-ONLY" placeholder doesn't show up
    // and that "high-risk" specific articles are filtered out
    const lawsSection = extractTab(html, 'laws');
    expect(lawsSection).not.toMatch(/Conformity\s+Assessment\s+Procedure/i);
  });

  it('Healthcare profile: includes domain-specific obligations', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithLawsProfile('provider', 'high', 'healthcare'));

    const lawsSection = extractTab(html, 'laws');
    // Healthcare profile should show medical-context obligations
    const hasHealthcareCtx =
      /healthcare|medical|MED-|patient/i.test(lawsSection);
    expect(hasHealthcareCtx).toBe(true);
  });

  it('Laws tab includes "not applicable" disclaimer with count', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithLawsProfile('deployer', 'limited', 'general'));

    const lawsSection = extractTab(html, 'laws');
    const hasNotApplicableDisclaimer =
      /not\s+applicable\s+(for|to)\s+your\s+profile/i.test(lawsSection) ||
      /\+\s*\d+\s+(more|other|additional)\s+obligation/i.test(lawsSection) ||
      /excluded/i.test(lawsSection);
    expect(hasNotApplicableDisclaimer).toBe(true);
  });

  it('Disclaimer references other profiles where excluded obligations apply', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithLawsProfile('deployer', 'limited', 'general'));

    const lawsSection = extractTab(html, 'laws');
    // Should mention high-risk OR provider as where excluded obligations apply
    const referencesOtherProfile = /high.?risk|provider|healthcare|finance/i.test(lawsSection);
    expect(referencesOtherProfile).toBe(true);
  });
});

// ── Helpers ────────────────────────────────────────────────────────

function extractTab(html: string, tabId: string): string {
  // Try multiple tab-extraction patterns since exact HTML structure may vary
  const patterns = [
    new RegExp(`<section[^>]*id=["']?tab-${tabId}["']?[^>]*>([\\s\\S]*?)</section>`, 'i'),
    new RegExp(`<div[^>]*id=["']?${tabId}["']?[^>]*>([\\s\\S]*?)</div>`, 'i'),
    new RegExp(`data-tab=["']?${tabId}["']?[^>]*>([\\s\\S]*?)</`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  // Fallback: full html if no tab structure detected
  return html;
}

function buildReportWithLawsProfile(role: string, riskLevel: string, domain: string): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  return {
    generatedAt: '2026-04-26T00:00:00Z',
    compliorVersion: '0.10.0-test',
    profile: {
      role,
      riskLevel,
      domain,
      applicableArticles: ['Article 4', 'Article 5'],
    },
    readiness: {
      readinessScore: 75, zone: 'yellow' as const,
      dimensions: { scan: dim(75), scanSecurity: dim(null), scanLlm: dim(null), docs: dim(60), documents: dim(60), passports: dim(70), eval: dim(null), evidence: dim(100) },
      trend: null, criticalCaps: [], daysUntilEnforcement: 100,
    },
    documents: { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, documents: [] },
    obligations: {
      total: 108,
      covered: 30,
      uncovered: 78,
      byArticle: [
        { article: 'Article 4', total: 1, covered: 1 },
        { article: 'Article 5', total: 1, covered: 0 },
        { article: 'Article 27', total: 1, covered: 0 },
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
