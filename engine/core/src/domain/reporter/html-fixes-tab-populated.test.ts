/**
 * V1-M27 / HR-6: RED test — Fixes tab must be populated (not empty).
 *
 * Background:
 *   User feedback: "Fixes - пусто. Мы ничего не делали?"
 *   V1-M22 A-6 unit test passed but production renderer doesn't show anything
 *   in Fixes tab.
 *
 * Specification:
 *   Fixes tab has 2 sections:
 *   1. Applied fixes (from .complior/fixes-history.json) — list with date + impact
 *   2. Available fix plans (from current scan) — sorted by score impact, top 10
 *
 *   If no fixes (already compliant):
 *   - Show "✓ No fixes needed — your project is compliant"
 *
 * Architecture:
 *   - Wire report.fixHistory + scan.findings.filter(fixable) into renderTabFixes
 *   - Pure render fn
 */

import { describe, it, expect } from 'vitest';

describe('V1-M27 HR-6: Fixes tab populated with applied + pending', () => {
  it('Fixes tab shows "Applied fixes" section when history has entries', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithFixHistory());

    const fixesTab = extractTab(html, 'fixes');
    const hasApplied =
      /\bApplied\b/i.test(fixesTab) ||
      /class="[^"]*applied[^"]*"/i.test(fixesTab) ||
      /\bHistory\b/i.test(fixesTab);
    expect(hasApplied).toBe(true);
  });

  it('Fixes tab shows "Available fix plans" section when scan has fixable findings', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithFixHistory());

    const fixesTab = extractTab(html, 'fixes');
    const hasAvailable =
      /\bAvailable\b/i.test(fixesTab) ||
      /\bRecommended\b/i.test(fixesTab) ||
      /\bPending\b/i.test(fixesTab) ||
      /class="[^"]*fix-plan[^"]*"/i.test(fixesTab);
    expect(hasAvailable).toBe(true);
  });

  it('Fixes tab shows command for each available fix', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithFixHistory());

    const fixesTab = extractTab(html, 'fixes');
    expect(fixesTab).toMatch(/complior\s+fix/);
  });

  it('Fixes tab shows "No fixes needed" message when project is compliant', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportNoFixes());

    const fixesTab = extractTab(html, 'fixes');
    const hasNoFixesMsg =
      /no\s+fixes?\s+(needed|required)/i.test(fixesTab) ||
      /✓.*compliant/i.test(fixesTab) ||
      /all\s+(green|fixes?\s+applied)/i.test(fixesTab);
    expect(hasNoFixesMsg).toBe(true);
  });
});

// ── Helpers ────────────────────────────────────────────────────────

function extractTab(html: string, tabId: string): string {
  // Prefer tab-content div (pattern 2) over button (pattern 3) — button only
  // captures label text, not actual tab body. Pattern 2 uses lookahead to
  // stop at the next tab div boundary.
  const patterns = [
    new RegExp(`<section[^>]*id=["']?tab-${tabId}["']?[^>]*>([\\s\\S]*?)</section>`, 'i'),
    new RegExp(`<div[^>]*id=["']?tab-${tabId}["']?[^>]*>([\\s\\S]*?)(?=\\s*<div[^>]*id=["']?tab-)`, 'i'),
    new RegExp(`data-tab=["']?${tabId}["']?[^>]*>([\\s\\S]*?)</`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return html;
}

function buildReportWithFixHistory(): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  return {
    generatedAt: '2026-04-26T00:00:00Z',
    compliorVersion: '0.10.0-test',
    profile: { role: 'deployer', riskLevel: 'limited', domain: 'general', applicableArticles: ['Article 4'] },
    readiness: {
      readinessScore: 60, zone: 'yellow' as const,
      dimensions: { scan: dim(60), scanSecurity: dim(null), scanLlm: dim(null), docs: dim(50), documents: dim(50), passports: dim(70), eval: dim(null), evidence: dim(100) },
      trend: null, criticalCaps: [], daysUntilEnforcement: 100,
    },
    documents: { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, documents: [] },
    obligations: { total: 108, covered: 30, uncovered: 78, byArticle: [] },
    passports: { totalAgents: 0, averageCompleteness: 0, passports: [] },
    actionPlan: { actions: [] },
    summary: { topIssues: [], overallStatus: 'in-progress' },
    findings: [
      { checkId: 'l2-fria', type: 'fail', message: 'Missing FRIA', severity: 'high', fix: 'complior fix --doc fria', articleReference: 'Art. 27' },
      { checkId: 'l2-ai-literacy', type: 'fail', message: 'AI Literacy missing', severity: 'medium', fix: 'complior fix --doc ai-literacy', articleReference: 'Art. 4' },
    ],
    evalResults: null,
    fixHistory: [
      { id: 'fix-1', timestamp: '2026-04-25T10:00:00Z', checkId: 'l1-disclosure', impact: 5, status: 'applied' },
      { id: 'fix-2', timestamp: '2026-04-25T11:00:00Z', checkId: 'l3-banned-deps', impact: 8, status: 'applied' },
    ],
    documentContents: [],
  } as never;
}

function buildReportNoFixes(): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  return {
    generatedAt: '2026-04-26T00:00:00Z',
    compliorVersion: '0.10.0-test',
    profile: { role: 'deployer', riskLevel: 'limited', domain: 'general', applicableArticles: ['Article 4'] },
    readiness: {
      readinessScore: 100, zone: 'green' as const,
      dimensions: { scan: dim(100), scanSecurity: dim(null), scanLlm: dim(null), docs: dim(100), documents: dim(100), passports: dim(100), eval: dim(null), evidence: dim(100) },
      trend: null, criticalCaps: [], daysUntilEnforcement: 100,
    },
    documents: { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, documents: [] },
    obligations: { total: 108, covered: 108, uncovered: 0, byArticle: [] },
    passports: { totalAgents: 0, averageCompleteness: 0, passports: [] },
    actionPlan: { actions: [] },
    summary: { topIssues: [], overallStatus: 'compliant' },
    findings: [],
    evalResults: null,
    fixHistory: [],
    documentContents: [],
  } as never;
}
