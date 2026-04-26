/**
 * V1-M27 / HR-8: RED test — Actions/Timeline tabs have explanatory headers.
 *
 * Background:
 *   User feedback: "Actions and Timeline - не понимаю эти вкладки"
 *
 * Specification:
 *   - Actions tab: header explaining "Suggested next commands for your current state"
 *   - Timeline tab: header explaining "EU AI Act enforcement deadlines for your profile"
 *   - Suggestions deduplicated (V1-M22 A-7 reused)
 *   - Timeline shows: past deadlines (red), active period, upcoming (color-coded)
 *
 * Architecture:
 *   - Add <header> or <p class="tab-intro"> at top of each tab
 *   - Reuse existing actions/timeline data, add explanatory text only
 */

import { describe, it, expect } from 'vitest';

describe('V1-M27 HR-8: Actions/Timeline tabs have explanatory headers', () => {
  it('Actions tab includes explanatory intro paragraph', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReport());

    const actionsTab = extractTab(html, 'actions');
    const hasIntro =
      /Suggested\s+next\s+commands?/i.test(actionsTab) ||
      /Recommended\s+actions?\s+for/i.test(actionsTab) ||
      /class="[^"]*tab-intro[^"]*"/i.test(actionsTab) ||
      /<header[^>]*>[\s\S]*?<\/header>/i.test(actionsTab);
    expect(hasIntro).toBe(true);
  });

  it('Timeline tab includes explanatory intro paragraph', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReport());

    const timelineTab = extractTab(html, 'timeline');
    const hasIntro =
      /EU\s+AI\s+Act\s+(enforcement|deadlines?)/i.test(timelineTab) ||
      /Compliance\s+deadlines?\s+for/i.test(timelineTab) ||
      /class="[^"]*tab-intro[^"]*"/i.test(timelineTab) ||
      /<header[^>]*>[\s\S]*?<\/header>/i.test(timelineTab);
    expect(hasIntro).toBe(true);
  });

  it('Actions tab does not duplicate the same command suggestion', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReport());

    const actionsTab = extractTab(html, 'actions');
    // Count occurrences of `complior fix` — should appear at most once as a top-level suggestion
    const fixCount = (actionsTab.match(/<code[^>]*>complior\s+fix(\s+[^<]*)?<\/code>/g) ?? []).length;
    expect(fixCount).toBeLessThanOrEqual(2); // 1 main suggestion + 1 explanation reference
  });

  it('Timeline tab shows enforcement-period markers', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReport());

    const timelineTab = extractTab(html, 'timeline');
    // Should show date references (2026-08-02 main enforcement, etc.)
    const hasDeadline = /2026|2027|August|enforcement|deadline/i.test(timelineTab);
    expect(hasDeadline).toBe(true);
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

function buildReport(): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  return {
    generatedAt: '2026-04-26T00:00:00Z',
    compliorVersion: '0.10.0-test',
    profile: { role: 'deployer', riskLevel: 'limited', domain: 'general', applicableArticles: ['Article 4'] },
    readiness: {
      readinessScore: 75, zone: 'yellow' as const,
      dimensions: { scan: dim(75), scanSecurity: dim(null), scanLlm: dim(null), docs: dim(60), documents: dim(60), passports: dim(70), eval: dim(null), evidence: dim(100) },
      trend: null, criticalCaps: [], daysUntilEnforcement: 100,
    },
    documents: { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, documents: [] },
    obligations: { total: 108, covered: 50, uncovered: 58, byArticle: [] },
    passports: { totalAgents: 0, averageCompleteness: 0, passports: [] },
    actionPlan: {
      actions: [
        { rank: 1, command: 'complior fix --doc fria', title: 'Generate FRIA document', source: 'scan', severity: 'high', scoreImpact: 10 },
        { rank: 2, command: 'complior scan --llm', title: 'Run deep LLM scan', source: 'scan', severity: 'medium', scoreImpact: 5 },
      ],
    },
    summary: { topIssues: [], overallStatus: 'in-progress' },
    findings: [],
    evalResults: null,
    fixHistory: [],
    documentContents: [],
  } as never;
}
