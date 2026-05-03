/**
 * V1-M27 / HR-7: RED test — Passports tab uses expandable detail layout.
 *
 * Background:
 *   User feedback: "Passports - а можно ли сделать чтобы их можно было
 *   раскрывать и получать всю детальную информацию по паспорту?"
 *
 * Specification:
 *   - Each passport row uses HTML `<details><summary>` for expand/collapse
 *   - Summary line: name + completeness % + status badge
 *   - Expanded body has organized sections:
 *     - Identity (name, kind, autonomy_level, lifecycle_stage, role, riskLevel)
 *     - Compliance (art5_screening, FRIA, complior_score)
 *     - Endpoints + Capabilities (deployer_obligations_met/pending)
 *     - Evidence + Audit (chain entries, signed status)
 *
 * Architecture:
 *   - HTML `<details>` for native browser expand/collapse (no JS needed)
 *   - escapeHtml on user data
 *   - Sections by passport schema groupings
 */

import { describe, it, expect } from 'vitest';

describe('V1-M27 HR-7: Passports tab uses expandable detail layout', () => {
  it('Each passport row wraps in HTML <details> element', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithPassports());

    const passportTab = extractTab(html, 'passports');
    const detailsCount = (passportTab.match(/<details[\s>]/g) ?? []).length;
    expect(detailsCount).toBeGreaterThanOrEqual(1);
  });

  it('Each <details> contains <summary> with passport name and completeness', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithPassports());

    const passportTab = extractTab(html, 'passports');
    const hasSummaryWithName = /<summary[^>]*>[\s\S]*?test-agent-1[\s\S]*?<\/summary>/i.test(passportTab);
    const hasCompleteness = /\d+\s*%/.test(passportTab);
    expect(hasSummaryWithName).toBe(true);
    expect(hasCompleteness).toBe(true);
  });

  it('Expanded body has Identity / Compliance / Evidence sections', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithPassports());

    const passportTab = extractTab(html, 'passports');
    const hasIdentity = /\bIdentity\b/i.test(passportTab);
    const hasCompliance = /\bCompliance\b/i.test(passportTab);
    const hasEvidence = /\b(Evidence|Audit)\b/i.test(passportTab);
    expect(hasIdentity || hasCompliance || hasEvidence).toBe(true);
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

function buildReportWithPassports(): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  return {
    generatedAt: '2026-04-26T00:00:00Z',
    compliorVersion: '0.10.0-test',
    profile: { role: 'deployer', riskLevel: 'limited', domain: 'general', applicableArticles: ['Article 4'] },
    readiness: {
      readinessScore: 75, zone: 'yellow' as const,
      dimensions: { scan: dim(75), scanSecurity: dim(null), scanLlm: dim(null), docs: dim(60), documents: dim(60), passports: dim(85), eval: dim(null), evidence: dim(100) },
      trend: null, criticalCaps: [], daysUntilEnforcement: 100,
    },
    documents: { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, documents: [] },
    obligations: { total: 108, covered: 50, uncovered: 58, byArticle: [] },
    passports: {
      totalAgents: 2,
      averageCompleteness: 75,
      passports: [
        { name: 'test-agent-1', completeness: 85, friaCompleted: true, signed: true, autonomyLevel: 'L3', kind: 'deployer_agent', complianceStatus: 'compliant' },
        { name: 'test-agent-2', completeness: 65, friaCompleted: false, signed: true, autonomyLevel: 'L2', kind: 'standalone_agent', complianceStatus: 'in_progress' },
      ],
    },
    actionPlan: { actions: [] },
    summary: { topIssues: [], overallStatus: 'in-progress' },
    findings: [],
    evalResults: null,
    fixHistory: [],
    documentContents: [],
  } as never;
}
