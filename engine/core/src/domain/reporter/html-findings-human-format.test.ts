/**
 * V1-M27 / HR-3: RED test — Findings tab uses human-friendly card format.
 *
 * Background:
 *   User feedback: "Findings - слишком сухо и формально. Как будто ты
 *   общаешься с компьютером, а не с человеком. Надо подумать над формой как
 *   эти файндинги сделать полезными для человека"
 *
 * Specification:
 *   Each finding card has 3 distinct sections:
 *   1. WHAT HAPPENED (plain language explanation)
 *   2. WHY THIS MATTERS (business/legal context — article, penalty)
 *   3. WHAT TO DO (actionable — exact command, estimated effort)
 *
 *   Card visual structure: heading (icon + finding title) + 3 labeled blocks +
 *   metadata footer (severity, article, auto-fixable indicator).
 *
 * Architecture:
 *   - Reuse finding-explanations.ts (V1-M10 work)
 *   - Pure render fn
 */

import { describe, it, expect } from 'vitest';

describe('V1-M27 HR-3: Findings tab uses human-friendly cards', () => {
  it('Finding card contains "What happened" or equivalent label', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithFindings());

    const hasWhatLabel =
      /\bWhat happened\b/i.test(html) ||
      /class="[^"]*finding-what[^"]*"/i.test(html) ||
      /<span[^>]*>\s*What\s*<\/span>/i.test(html);
    expect(hasWhatLabel).toBe(true);
  });

  it('Finding card contains "Why this matters" or equivalent label', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithFindings());

    const hasWhyLabel =
      /\bWhy (this )?matters?\b/i.test(html) ||
      /class="[^"]*finding-why[^"]*"/i.test(html) ||
      /\bImpact\b/.test(html);
    expect(hasWhyLabel).toBe(true);
  });

  it('Finding card contains "What to do" or equivalent label', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithFindings());

    const hasActionLabel =
      /\bWhat to do\b/i.test(html) ||
      /class="[^"]*finding-action[^"]*"/i.test(html) ||
      /\bRecommended action\b/i.test(html);
    expect(hasActionLabel).toBe(true);
  });

  it('Finding card mentions specific complior command for resolution', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithFindings());

    // Action should reference exact command (e.g. `complior fix --doc fria`)
    expect(html).toMatch(/complior\s+(fix|scan|passport|eval)/);
  });

  it('Finding card includes EU AI Act article + penalty info', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithFindings());

    // Article reference visible
    expect(html).toMatch(/Art(\.|icle)\s*\d+/i);
    // Penalty info — mentions €, M (millions), or "fine"
    const hasPenalty = /€\s*\d+M?|penalt(y|ies)|fine/i.test(html);
    expect(hasPenalty).toBe(true);
  });
});

function buildReportWithFindings(): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  return {
    generatedAt: '2026-04-26T00:00:00Z',
    compliorVersion: '0.10.0-test',
    profile: { role: 'deployer', riskLevel: 'high', domain: 'healthcare', applicableArticles: ['Article 27'] },
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
      {
        checkId: 'l1-fria',
        type: 'fail',
        message: 'Missing FRIA document',
        severity: 'high',
        obligationId: 'eu-ai-act-OBL-027',
        articleReference: 'Article 27',
        fix: 'Run `complior fix --doc fria` to generate scaffold',
        explanation: {
          what: 'We checked your project for FRIA.md and didn\'t find it.',
          why: 'EU AI Act Art. 27 requires Fundamental Rights Impact Assessment before deploying high-risk AI. Penalty: €15M / 3% turnover.',
          how: 'Run `complior fix --doc fria` to generate a scaffold, then fill in your specific use case details. Estimated effort: 30 minutes.',
        },
      },
    ],
    evalResults: null,
    fixHistory: [],
    documentContents: [],
  } as never;
}
