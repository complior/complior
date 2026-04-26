/**
 * V1-M27 / HR-2: RED test — Tests tab must group by source command + descriptions.
 *
 * Background:
 *   User feedback: "TESTS - LLM01, ... вот такая кодицикация пользователю
 *   не понятна. У нас есть скан с разными флагами, эвал с разными флагами,
 *   все это разные направления тестов. Я хочу чтобы было понятно тот или иной
 *   тест к чему относится (например scan --security) и что тестирует."
 *
 * Specification:
 *   Tests tab must have grouped sections, each with a heading + human description:
 *   - Scan (deterministic, AST/rules) — N tests
 *   - Eval --det (conformity, no LLM) — N tests
 *   - Eval --llm (LLM-judged conformity) — N tests
 *   - Eval --security (OWASP LLM Top 10 + MITRE ATLAS) — N probes
 *   - Scan --deep (Semgrep/Bandit/ModelScan) — N findings
 *
 *   Per-section description explains WHAT the tests check in human language,
 *   referencing the source command.
 *
 * Architecture:
 *   - Pure render fn
 *   - Group-by-source pure data transform
 *   - Reuse existing test count metadata
 */

import { describe, it, expect } from 'vitest';

describe('V1-M27 HR-2: Tests tab grouped by source command with descriptions', () => {
  it('Tests tab contains "Scan" section header', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithTests());

    // Section heading mentions Scan
    const hasScanSection =
      /<h[2-4][^>]*>[^<]*\bScan\b[^<]*<\/h[2-4]>/i.test(html) ||
      /class="[^"]*test-group[^"]*"[^>]*>\s*<[^>]+>\s*Scan/i.test(html);
    expect(hasScanSection).toBe(true);
  });

  it('Tests tab contains "Eval" section header', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithTests());

    const hasEvalSection = /<h[2-4][^>]*>[^<]*\bEval\b[^<]*<\/h[2-4]>/i.test(html);
    expect(hasEvalSection).toBe(true);
  });

  it('Tests tab contains "Security" section (OWASP/MITRE)', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithTests());

    const hasSecuritySection =
      /<h[2-4][^>]*>[^<]*\bSecurity\b[^<]*<\/h[2-4]>/i.test(html) ||
      /OWASP\s+LLM/i.test(html);
    expect(hasSecuritySection).toBe(true);
  });

  it('Each test section includes human description referencing the source command', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithTests());

    // Description should mention `complior scan`/`complior eval` and what is tested
    const mentionsScanCmd = /complior\s+scan/.test(html);
    const mentionsEvalCmd = /complior\s+eval/.test(html);
    const hasDescription =
      /\bcheck(s|ing)?\b[^<]{20,}/i.test(html) ||
      /\btests?\s+for\s+[a-z]+/i.test(html);

    expect(mentionsScanCmd).toBe(true);
    expect(mentionsEvalCmd).toBe(true);
    expect(hasDescription).toBe(true);
  });
});

// ── Helpers ────────────────────────────────────────────────────────

function buildReportWithTests(): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  return {
    generatedAt: '2026-04-26T00:00:00Z',
    compliorVersion: '0.10.0-test',
    profile: { role: 'deployer', riskLevel: 'limited', domain: 'general', applicableArticles: ['Article 4'] },
    readiness: {
      readinessScore: 75,
      zone: 'yellow' as const,
      dimensions: {
        scan: dim(75),
        scanSecurity: dim(80),
        scanLlm: dim(70),
        docs: dim(60),
        documents: dim(60),
        passports: dim(70),
        eval: dim(85),
        evidence: dim(100),
      },
      trend: null,
      criticalCaps: [],
      daysUntilEnforcement: 100,
    },
    documents: { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, documents: [] },
    obligations: { total: 108, covered: 50, uncovered: 58, byArticle: [] },
    passports: { totalAgents: 0, averageCompleteness: 0, passports: [] },
    actionPlan: { actions: [] },
    summary: { topIssues: [], overallStatus: 'in-progress' },
    findings: [],
    evalResults: {
      tier: 'all',
      determined: { total: 168, passed: 120, failed: 48 },
      llmJudged: { total: 212, passed: 150, failed: 62 },
      security: { total: 300, passed: 267, failed: 33 },
    },
    fixHistory: [],
    documentContents: [],
  } as never;
}
