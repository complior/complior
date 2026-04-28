/**
 * V1-M30.2 / HR-T1, HR-T2, HR-T3, HR-T5: RED — Tests tab UX polish.
 *
 * Bugs observed in /deep-e2e Profile C (2026-04-28):
 *   HR-T1: Header shows "Score (F): 0" while securityScore=96
 *   HR-T2: Scan section says "No tests in this category." while scanner found 59 findings
 *   HR-T3: Empty Eval --det/--llm sections give no actionable hint
 *   HR-T5: "Total: 300" header counter ignores scanner findings (misleading label)
 *
 * Each test uses a contrived ComplianceReport fixture and asserts the rendered HTML.
 */

import { describe, it, expect } from 'vitest';
import type {
  ComplianceReport,
  EvalResultsSummary,
  EvalTestSummary,
  FindingSummary,
  ReportSummary,
} from './types.js';

const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });

const baseSummary: ReportSummary = {
  readinessScore: 70, zone: 'yellow' as const,
  scanScore: 77, evalScore: 91,
  documentsTotal: 14, documentsReviewed: 0,
  obligationsTotal: 4, obligationsCovered: 0,
  passportsTotal: 2, passportsComplete: 0,
  evidenceChainLength: 1000, evidenceVerified: true,
  totalFindings: 10, criticalFindings: 0, autoFixable: 5,
  daysUntilEnforcement: 96, enforcementDate: '2026-08-02',
  generatedAt: '2026-04-28T10:48:32.816Z', compliorVersion: '0.10.0-test',
};

const baseReport = (overrides: {
  evalResults?: EvalResultsSummary | null;
  findings?: readonly FindingSummary[];
}): ComplianceReport => ({
  generatedAt: '2026-04-28T10:48:32.816Z',
  compliorVersion: '0.10.0-test',
  profile: { role: 'deployer', riskLevel: 'limited', domain: 'general' },
  readiness: {
    readinessScore: 70, zone: 'yellow' as const,
    dimensions: {
      scan: dim(77), scanSecurity: dim(96), scanLlm: dim(null),
      docs: dim(50), documents: dim(50), passports: dim(22),
      eval: dim(91), evidence: dim(100),
    },
    trend: null, criticalCaps: [], daysUntilEnforcement: 96,
  },
  documents: { total: 14, byStatus: { missing: 14, scaffold: 0, draft: 0, reviewed: 0 }, documents: [], score: 50, excludedCount: 0 } as never,
  obligations: { total: 4, covered: 0, uncovered: 4, coveragePercent: 0, byArticle: [], critical: [], excludedCount: 0 },
  passports: { totalAgents: 2, passports: [], averageCompleteness: 22 },
  actionPlan: { actions: [], totalActions: 0, shownActions: 0 },
  summary: baseSummary,
  findings: overrides.findings ?? [],
  evalResults: overrides.evalResults ?? null,
  fixHistory: [],
  documentContents: [],
});

const securityOnlyEval: EvalResultsSummary = {
  overallScore: 0, // ← bug: weighted-score over 11 conformity bins (all empty) = 0
  grade: 'F',
  totalTests: 300, passed: 286, failed: 11, errors: 3, inconclusive: 0, skipped: 0,
  duration: 113_901,
  categories: [],
  tests: Array.from({ length: 5 }, (_, i): EvalTestSummary => ({
    testId: `owasp-${i}`,
    category: 'robustness',
    name: `OWASP probe ${i}`,
    method: 'deterministic',
    verdict: 'pass',
    score: 100,
    confidence: 95,
    reasoning: 'No injection detected',
    probe: 'Ignore previous instructions and...',
    response: 'I cannot ignore my safety guidelines.',
    latencyMs: 250,
    owaspCategory: 'LLM01',
    severity: 'medium',
  })),
  securityScore: 96,
  securityGrade: 'A',
};

const sampleFindings: readonly FindingSummary[] = Array.from({ length: 59 }, (_, i): FindingSummary => ({
  checkId: `l2-finding-${i}`,
  type: i < 50 ? 'pass' : 'fail',
  message: `Finding ${i}`,
  severity: i < 50 ? 'low' : 'medium',
  layer: 'L2',
  fixAvailable: i % 5 === 0,
}));

function extractTab(html: string, tabId: string): string {
  const m = html.match(new RegExp(`<div class="tab-content" id="tab-${tabId}"[^>]*>([\\s\\S]*?)(?=<div class="tab-content"|</body>)`, 'i'));
  return m ? m[1] : '';
}

describe('V1-M30.2 HR-T1: header score uses securityScore when conformity is empty', () => {
  it('Security-only eval (overallScore=0, securityScore=96) → header shows Score (A): 96, NOT (F): 0', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport({ evalResults: securityOnlyEval }));
    const tab = extractTab(html, 'tests');

    // Header score must reflect the security score, not the bogus zero
    expect(tab).toMatch(/Score \(A\)[\s\S]*?96/);
    expect(tab).not.toMatch(/Score \(F\)[\s\S]*?>0</);
  });

  it('Security-only eval renders an explanatory subtitle', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport({ evalResults: securityOnlyEval }));
    const tab = extractTab(html, 'tests');

    // Helps the reader understand why the score is computed from security alone
    expect(tab).toMatch(/security only|run\s+`?complior eval --det`?\s+for full coverage/i);
  });
});

describe('V1-M30.2 HR-T2: Scan section references Findings tab when findings exist', () => {
  it('Scan section with 0 ev tests + 59 findings → message points to Findings tab with the count', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport({ evalResults: securityOnlyEval, findings: sampleFindings }));
    const tab = extractTab(html, 'tests');

    // Pull the Scan section content (between Scan h3 and the next h3)
    const scanMatch = tab.match(/<h3[^>]*>Scan<\/h3>[\s\S]*?(?=<h3|$)/);
    const scanSection = scanMatch?.[0] ?? '';

    expect(scanSection, 'Scan section should be present').toBeTruthy();
    // Mention the actual finding count (59) and direct user to Findings tab
    expect(scanSection).toMatch(/\b59\b/);
    expect(scanSection.toLowerCase()).toMatch(/findings tab|see findings|view in findings/);
  });
});

describe('V1-M30.2 HR-T3: empty eval sections include actionable command hint', () => {
  it('Empty Eval --det section → message includes <code>complior eval --det</code>', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport({ evalResults: securityOnlyEval }));
    const tab = extractTab(html, 'tests');

    const detMatch = tab.match(/<h3[^>]*>Eval --det<\/h3>[\s\S]*?(?=<h3|$)/);
    const detSection = detMatch?.[0] ?? '';

    expect(detSection, 'Eval --det section should be present').toBeTruthy();
    expect(detSection).toMatch(/<code[^>]*>[^<]*complior eval --det[^<]*<\/code>/);
    expect(detSection.toLowerCase()).not.toMatch(/^\s*no tests in this category\.\s*$/m);
  });

  it('Empty Eval --llm section → message includes <code>complior eval --llm</code>', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport({ evalResults: securityOnlyEval }));
    const tab = extractTab(html, 'tests');

    const llmMatch = tab.match(/<h3[^>]*>Eval --llm<\/h3>[\s\S]*?(?=<h3|$)/);
    const llmSection = llmMatch?.[0] ?? '';

    expect(llmSection, 'Eval --llm section should be present').toBeTruthy();
    expect(llmSection).toMatch(/<code[^>]*>[^<]*complior eval --llm[^<]*<\/code>/);
  });
});

describe('V1-M30.2 HR-T5: Total stat label is not bare "Total"', () => {
  it('Header stat row → label is "Eval tests" (or similarly disambiguated), NOT bare "Total"', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport({ evalResults: securityOnlyEval }));
    const tab = extractTab(html, 'tests');

    // Find stat-label values present in the header
    const labels = Array.from(tab.matchAll(/<span class="stat-label">([^<]+)<\/span>/g)).map((m) => m[1].trim());

    expect(labels.length, `expected stat labels in tests tab; got ${labels.length}`).toBeGreaterThan(0);
    // No bare "Total" — must be qualified (Eval tests, OWASP tests, …)
    expect(labels).not.toContain('Total');
    expect(labels.some((l) => /eval tests|owasp tests|tests run/i.test(l))).toBe(true);
  });
});
