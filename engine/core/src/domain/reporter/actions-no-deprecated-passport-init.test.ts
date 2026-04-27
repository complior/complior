/**
 * V1-M29 / W-5: RED test — Actions tab MUST NOT include deprecated `passport init` command.
 *
 * Background (per /deep-e2e tab analysis 2026-04-27):
 * - All 3 profiles' Actions tab still includes `complior passport init` suggestion
 * - V1-M22 A-7 spec said to remove it (deprecated since V1-M11 — passports auto-created via `complior init`)
 * - V1-M27 HR-8 dedup didn't remove it
 *
 * Specification:
 *   - Actions tab HTML must NOT contain `passport init` substring
 *   - Suggestion list must NOT contain commands matching /complior\s+passport\s+init/
 *   - actionPlan.actions array (built by service) must filter out passport init
 */

import { describe, it, expect } from 'vitest';

describe('V1-M29 W-5: Actions tab excludes deprecated passport init', () => {
  it('html-renderer Actions tab does NOT contain "passport init"', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithPassportInitAction());
    const actionsTab = extractTab(html, 'actions');
    expect(actionsTab).not.toMatch(/passport\s+init/);
  });

  it('Actions tab still contains valid suggestions (not empty)', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithValidActions());
    const actionsTab = extractTab(html, 'actions');
    // At least one valid action (complior fix / scan / eval / report etc.) shown
    expect(actionsTab).toMatch(/complior\s+(fix|scan|eval|report|passport)/);
  });

  it('action filter helper (if exposed) excludes passport init from action list', async () => {
    // Optional: if there's a pure helper like filterActions(actions), test it.
    // Otherwise this is covered by the HTML check above.
    let helper: ((actions: readonly { command?: string }[]) => readonly { command?: string }[]) | undefined;
    try {
      const mod = await import('./actions-suggestions.js');
      helper = (mod as unknown as {
        filterDeprecatedActions?: typeof helper;
      }).filterDeprecatedActions;
    } catch {
      // module may not exist; skip silently
      return;
    }
    if (!helper) return;
    const filtered = helper([
      { command: 'complior passport init' },
      { command: 'complior fix' },
      { command: 'complior scan --json' },
    ]);
    expect(filtered.find((a) => a.command?.includes('passport init'))).toBeUndefined();
    expect(filtered.length).toBe(2);
  });
});

function extractTab(html: string, tabId: string): string {
  const m = html.match(new RegExp(`<div class="tab-content" id="tab-${tabId}"[^>]*>([\\s\\S]*?)(?=<div class="tab-content"|</body>)`, 'i'));
  return m ? m[1] : '';
}

function buildReportWithPassportInitAction(): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  return {
    generatedAt: '2026-04-27T00:00:00Z',
    compliorVersion: '0.10.0-test',
    profile: { role: 'deployer', riskLevel: 'limited', domain: 'general', applicableArticles: [] },
    readiness: {
      readinessScore: 60, zone: 'yellow' as const,
      dimensions: { scan: dim(60), scanSecurity: dim(null), scanLlm: dim(null), docs: dim(60), documents: dim(60), passports: dim(70), eval: dim(null), evidence: dim(100) },
      trend: null, criticalCaps: [], daysUntilEnforcement: 100,
    },
    documents: { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, documents: [] },
    obligations: { total: 108, covered: 50, uncovered: 58, byArticle: [] },
    passports: { totalAgents: 0, averageCompleteness: 0, passports: [] },
    actionPlan: {
      actions: [
        { rank: 1, command: 'complior passport init', title: 'Initialize passport (deprecated)', source: 'passport', severity: 'low', scoreImpact: 0 },
        { rank: 2, command: 'complior fix --doc fria', title: 'Generate FRIA', source: 'scan', severity: 'high', scoreImpact: 10 },
      ],
    },
    summary: { topIssues: [], overallStatus: 'in-progress' },
    findings: [],
    evalResults: null,
    fixHistory: [],
    documentContents: [],
  } as never;
}

function buildReportWithValidActions(): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  return {
    generatedAt: '2026-04-27T00:00:00Z',
    compliorVersion: '0.10.0-test',
    profile: { role: 'deployer', riskLevel: 'limited', domain: 'general', applicableArticles: [] },
    readiness: {
      readinessScore: 60, zone: 'yellow' as const,
      dimensions: { scan: dim(60), scanSecurity: dim(null), scanLlm: dim(null), docs: dim(60), documents: dim(60), passports: dim(70), eval: dim(null), evidence: dim(100) },
      trend: null, criticalCaps: [], daysUntilEnforcement: 100,
    },
    documents: { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, documents: [] },
    obligations: { total: 108, covered: 50, uncovered: 58, byArticle: [] },
    passports: { totalAgents: 0, averageCompleteness: 0, passports: [] },
    actionPlan: {
      actions: [
        { rank: 1, command: 'complior fix --doc fria', title: 'Generate FRIA', source: 'scan', severity: 'high', scoreImpact: 10 },
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
