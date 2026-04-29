/**
 * V1-M30.4 / Section A: RED — tab UX polish.
 *
 * 7 sub-areas, all assert against `generateReportHtml(report)`:
 *   A.1 — every tab has a `<p class="tab-intro">` explainer
 *   A.2 — Findings cards with matching fixHistory.checkId show "re-scan" badge
 *   A.3 — Laws obligations have status badges + linkedCheck anchors
 *   A.4 — Documents have file:// links + status legend
 *   A.5 — Fixes rows where scoreBefore === scoreAfter explain "no overall change"
 *   A.6 — Actions have source-icon prefix + "Done" badge if matched in fixHistory
 *   A.7 — Tests sections sort failed-first within each section
 */

import { describe, it, expect } from 'vitest';
import type { ComplianceReport } from './types.js';

const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });

const baseReport: ComplianceReport = {
  generatedAt: '2026-04-29T10:00:00Z',
  compliorVersion: '0.10.0-test',
  profile: { role: 'deployer', riskLevel: 'limited', domain: 'general', applicableArticles: ['Article 4'] },
  readiness: {
    readinessScore: 71, zone: 'yellow' as const,
    dimensions: {
      scan: dim(75), scanSecurity: dim(77), scanLlm: dim(75),
      docs: dim(64), documents: dim(64), passports: dim(22),
      eval: dim(84), evidence: dim(100),
    },
    trend: null, criticalCaps: [], daysUntilEnforcement: 95,
  },
  documents: {
    total: 2, byStatus: { missing: 0, scaffold: 0, draft: 1, reviewed: 1 }, score: 64, excludedCount: 0,
    documents: [
      { docType: 'fria', article: 'Art. 27', description: 'FRIA',
        outputFile: '/abs/path/docs/compliance/fria.md', status: 'draft', scoreImpact: 5,
        prefilledPercent: 30, lastModified: null, templateFile: null },
      { docType: 'risk-management', article: 'Art. 9', description: 'Risk Mgmt',
        outputFile: '/abs/path/docs/compliance/risk-management.md', status: 'reviewed', scoreImpact: 8,
        prefilledPercent: 100, lastModified: null, templateFile: null },
    ],
  } as never,
  obligations: {
    total: 3, covered: 1, uncovered: 2, coveragePercent: 33, excludedCount: 5,
    byArticle: [{
      article: 'Art. 26',
      total: 2,
      covered: 1,
      obligations: [
        { id: 'OBL-001', article: 'Art. 26', title: 'Inform Workers', role: 'deployer',
          severity: 'medium', deadline: '2026-08-02', covered: false, linkedChecks: ['l2-worker-notification'] },
        { id: 'OBL-002', article: 'Art. 26', title: 'Maintain Logs', role: 'deployer',
          severity: 'low', deadline: '2027-08-02', covered: true, linkedChecks: ['l2-logging'] },
      ],
    }],
    critical: [],
  },
  passports: { totalAgents: 2, passports: [], averageCompleteness: 22 },
  actionPlan: {
    actions: [
      { rank: 1, source: 'obligation', id: 'OBL-001', title: 'Inform Workers', article: 'Art. 26',
        severity: 'high', deadline: '2026-08-02', daysLeft: 95, scoreImpact: 8, fixAvailable: true,
        command: 'complior fix --doc worker-notification', priorityScore: 90 },
      { rank: 2, source: 'scan', id: 'l2-fria', title: 'FRIA scaffold incomplete', article: 'Art. 27',
        severity: 'medium', deadline: null, daysLeft: null, scoreImpact: 5, fixAvailable: true,
        command: 'complior fix --check-id l2-fria', priorityScore: 70 },
      { rank: 3, source: 'document', id: 'qms', title: 'Create QMS doc', article: 'Art. 17',
        severity: 'low', deadline: null, daysLeft: null, scoreImpact: 3, fixAvailable: false,
        command: 'complior fix --doc qms', priorityScore: 40 },
    ],
    totalActions: 3, shownActions: 3,
  },
  summary: {
    readinessScore: 71, zone: 'yellow' as const, scanScore: 75, evalScore: 84,
    documentsTotal: 2, documentsReviewed: 1, obligationsTotal: 3, obligationsCovered: 1,
    passportsTotal: 2, passportsComplete: 0, evidenceChainLength: 1000, evidenceVerified: true,
    totalFindings: 1, criticalFindings: 0, autoFixable: 1,
    daysUntilEnforcement: 95, enforcementDate: '2026-08-02',
    generatedAt: '2026-04-29T10:00:00Z', compliorVersion: '0.10.0-test',
  },
  findings: [
    { checkId: 'l2-fria', type: 'fail', message: 'FRIA scaffold incomplete', severity: 'medium',
      layer: 'L2', fixAvailable: true },
    { checkId: 'l2-already-fixed', type: 'fail', message: 'Already-fixed example', severity: 'low',
      layer: 'L2', fixAvailable: true },
  ],
  evalResults: null,
  fixHistory: [
    { id: 1, checkId: 'l2-already-fixed', fixType: 'template', status: 'applied',
      timestamp: '2026-04-29T08:00:00Z', files: [{ path: 'docs/x.md', action: 'created' }],
      scoreBefore: 70, scoreAfter: 70 },  // same before/after — should trigger "no overall change"
    { id: 2, checkId: 'l2-other', fixType: 'splice', status: 'applied',
      timestamp: '2026-04-29T08:30:00Z', files: [{ path: 'src/x.js', action: 'modified' }],
      scoreBefore: 70, scoreAfter: 75 },  // real change
  ],
  documentContents: [],
};

function tab(html: string, id: string): string {
  const m = html.match(new RegExp(`<div class="tab-content" id="tab-${id}"[^>]*>([\\s\\S]*?)(?=<div class="tab-content"|</body>)`, 'i'));
  return m ? m[1] : '';
}

describe('V1-M30.4 A.1: every tab has tab-intro explainer', () => {
  const tabs: ReadonlyArray<readonly [string, RegExp]> = [
    ['overview',  /7 dimensions|equal weight|readiness|green|yellow/i],
    ['tests',     /scan|eval|owasp|probe|deterministic|llm/i],
    ['findings',  /5-layer|scanner|fix|re.?scan|check-id/i],
    ['laws',      /obligation|covered|pending|profile|EU AI Act|certification/i],
    ['documents', /missing|scaffold|draft|reviewed|click|editor/i],
    ['fixes',     /history|complior fix|score change|dimension|cumulative/i],
    ['passports', /agent passport|identity|36|completeness|art\.?\s*11/i],
    ['actions',   /priorit|next step|severity|deadline|click|copy/i],
    ['timeline',  /enforcement|deadline|2025|2026|2027|annex/i],
  ];

  it.each(tabs)('tab "%s" has a meaningful tab-intro paragraph', async (tabId, requiredKeyword) => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport);
    const t = tab(html, tabId);
    expect(t, `tab #${tabId} should be present in HTML`).toBeTruthy();
    const intro = t.match(/<p class="tab-intro">([\s\S]*?)<\/p>/);
    expect(intro, `tab #${tabId} must have <p class="tab-intro">`).not.toBeNull();
    expect(intro![1], `tab #${tabId} intro must contain a meaningful keyword`).toMatch(requiredKeyword);
  });
});

describe('V1-M30.4 A.2: Findings card shows re-scan hint when checkId matches fixHistory', () => {
  it('finding with checkId matching fixHistory shows "re-scan to verify" badge', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport);
    const t = tab(html, 'findings');
    // l2-already-fixed is in fixHistory + is a finding
    const cardMatch = t.match(/<div class="finding-card"[^>]*>[\s\S]*?l2-already-fixed[\s\S]*?<\/div>/);
    expect(cardMatch, 'finding-card for l2-already-fixed must be present').not.toBeNull();
    // Badge must mention re-scan
    expect(cardMatch![0]).toMatch(/re.?scan|fix applied/i);
  });

  it('finding without matching fixHistory does NOT show re-scan badge', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport);
    const t = tab(html, 'findings');
    const cardMatch = t.match(/<div class="finding-card"[^>]*>(?:(?!<\/div>)[\s\S])*?l2-fria[\s\S]*?<\/div>/);
    expect(cardMatch).not.toBeNull();
    // l2-fria is NOT in fixHistory, so no "re-scan to verify" inside its card
    expect(cardMatch![0]).not.toMatch(/re.?scan to verify/i);
  });
});

describe('V1-M30.4 A.3: Laws — status badges + linkedCheck anchors', () => {
  it('uncovered obligation shows pending status badge', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport);
    const t = tab(html, 'laws');
    // OBL-001 covered=false → pending
    const oblBlock = t.match(/OBL-001[\s\S]{0,500}/);
    expect(oblBlock, 'OBL-001 should be rendered').not.toBeNull();
    expect(oblBlock![0]).toMatch(/pending|⏳/i);
  });

  it('linkedChecks render as #tab-findings anchor', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport);
    const t = tab(html, 'laws');
    expect(t).toMatch(/<a[^>]+href="#tab-findings"[^>]*>[\s\S]*?l2-worker-notification/);
  });
});

describe('V1-M30.4 A.4: Documents — file:// links + status legend', () => {
  it('each document outputFile is rendered as file:// anchor', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport);
    const t = tab(html, 'documents');
    expect(t).toMatch(/<a[^>]+href="file:\/\/[^"]*fria\.md"/);
    expect(t).toMatch(/<a[^>]+href="file:\/\/[^"]*risk-management\.md"/);
  });

  it('status legend at top of tab explains 4 statuses', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport);
    const t = tab(html, 'documents');
    expect(t).toMatch(/missing/i);
    expect(t).toMatch(/scaffold/i);
    expect(t).toMatch(/draft/i);
    expect(t).toMatch(/reviewed/i);
  });
});

describe('V1-M30.4 A.5: Fixes — "no overall change" when scoreBefore === scoreAfter', () => {
  it('fix entry with same scoreBefore and scoreAfter shows explanatory note', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport);
    const t = tab(html, 'fixes');
    // Fix #1 has scoreBefore=scoreAfter=70 — should explain
    expect(t).toMatch(/no overall change|single.dimension|expected/i);
  });

  it('fix entry with real score change shows the delta cleanly', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport);
    const t = tab(html, 'fixes');
    // Fix #2 scoreBefore=70 scoreAfter=75 — should still show 70 → 75
    expect(t).toMatch(/70\s*→\s*75|70\s*-&gt;\s*75|70\s*to\s*75/);
  });
});

describe('V1-M30.4 A.6: Actions — source icons + done state', () => {
  it('obligation action prefixed with 📋 emoji', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport);
    const t = tab(html, 'actions');
    expect(t).toMatch(/📋[\s\S]{0,200}Inform Workers/);
  });

  it('scan action prefixed with 🔍 emoji', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport);
    const t = tab(html, 'actions');
    expect(t).toMatch(/🔍[\s\S]{0,200}FRIA scaffold incomplete/);
  });

  it('document action prefixed with 📄 emoji', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(baseReport);
    const t = tab(html, 'actions');
    expect(t).toMatch(/📄[\s\S]{0,200}Create QMS doc/);
  });
});

describe('V1-M30.4 A.7: Tests sort — failed-first within section', () => {
  it('tests with mixed verdicts render error/fail before pass', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const reportWithMixed: ComplianceReport = {
      ...baseReport,
      evalResults: {
        overallScore: 70, grade: 'C', totalTests: 3, passed: 1, failed: 1, errors: 1,
        inconclusive: 0, skipped: 0, duration: 1000, categories: [],
        tests: [
          { testId: 'A', category: 'transparency', name: 'A passing', method: 'deterministic',
            verdict: 'pass', score: 100, confidence: 90, reasoning: 'ok', probe: 'q', response: 'a',
            latencyMs: 100 },
          { testId: 'B', category: 'transparency', name: 'B failing', method: 'deterministic',
            verdict: 'fail', score: 0, confidence: 90, reasoning: 'no match', probe: 'q', response: 'a',
            latencyMs: 100 },
          { testId: 'C', category: 'transparency', name: 'C error', method: 'deterministic',
            verdict: 'error', score: 0, confidence: 0, reasoning: 'err', probe: 'q', response: '',
            latencyMs: 0 },
        ],
        securityScore: undefined, securityGrade: undefined,
      },
    };
    const html = generateReportHtml(reportWithMixed);
    // Find positions of the three test rows
    const idxC = html.indexOf('C error');
    const idxB = html.indexOf('B failing');
    const idxA = html.indexOf('A passing');
    expect(idxC, 'C error should appear in HTML').toBeGreaterThan(0);
    expect(idxB).toBeGreaterThan(0);
    expect(idxA).toBeGreaterThan(0);
    // error first, then fail, then pass
    expect(idxC).toBeLessThan(idxB);
    expect(idxB).toBeLessThan(idxA);
  });
});
