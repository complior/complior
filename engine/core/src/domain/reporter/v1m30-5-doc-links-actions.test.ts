/**
 * V1-M30.5 / W-1, W-2, W-3, W-4: RED — fixes for V1-M30.4 deep-verification gaps.
 *
 *   W-1 — ComplianceReport.summary.projectPath populated from scanResult.projectPath
 *   W-2 — Documents tab file:// links use projectPath, not process.cwd()
 *   W-3 — Actions tab renders ALL actions (no command-dedup that drops distinct rows)
 *   W-4 — MD renderer humanizes generation timestamp
 */

import { describe, it, expect } from 'vitest';
import type {
  ComplianceReport,
  ReportSummary,
  PriorityAction,
} from './types.js';

const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });

const baseSummary: ReportSummary = {
  readinessScore: 70, zone: 'yellow' as const,
  scanScore: 75, evalScore: 80,
  documentsTotal: 2, documentsReviewed: 0,
  obligationsTotal: 0, obligationsCovered: 0,
  passportsTotal: 0, passportsComplete: 0,
  evidenceChainLength: 0, evidenceVerified: true,
  totalFindings: 0, criticalFindings: 0, autoFixable: 0,
  daysUntilEnforcement: 95, enforcementDate: '2026-08-02',
  generatedAt: '2026-04-29T10:00:00Z', compliorVersion: '0.10.0-test',
} as ReportSummary;

const makeReport = (over: Partial<ComplianceReport> & { summaryOver?: Partial<ReportSummary> } = {}): ComplianceReport => ({
  generatedAt: '2026-04-29T10:00:00Z',
  compliorVersion: '0.10.0-test',
  profile: { role: 'deployer', riskLevel: 'limited', domain: 'general' },
  readiness: {
    readinessScore: 70, zone: 'yellow' as const,
    dimensions: {
      scan: dim(75), scanSecurity: dim(77), scanLlm: dim(75),
      docs: dim(64), documents: dim(64), passports: dim(22),
      eval: dim(80), evidence: dim(100),
    },
    trend: null, criticalCaps: [], daysUntilEnforcement: 95,
  },
  documents: {
    total: 2, byStatus: { missing: 0, scaffold: 0, draft: 1, reviewed: 1 }, score: 64, excludedCount: 0,
    documents: [
      // V1-M30.8b TD-63: switched from FRIA to ai-literacy — V1-M30.6 W-1.2
      // filter excludes FRIA for limited-risk profiles (default in this fixture),
      // so the test could not verify file:// link rendering. ai-literacy is
      // universally applicable.
      { docType: 'ai-literacy', article: 'Art. 4', description: 'AI Literacy',
        outputFile: 'docs/compliance/ai-literacy-policy.md', status: 'draft', scoreImpact: 5,
        prefilledPercent: 30, lastModified: null, templateFile: null },
      { docType: 'risk-management', article: 'Art. 9', description: 'Risk Mgmt',
        outputFile: '/abs/path/risk.md', status: 'reviewed', scoreImpact: 8,
        prefilledPercent: 100, lastModified: null, templateFile: null },
    ],
  } as never,
  obligations: { total: 0, covered: 0, uncovered: 0, coveragePercent: 0, byArticle: [], critical: [], excludedCount: 0 },
  passports: { totalAgents: 0, passports: [], averageCompleteness: 0 },
  actionPlan: { actions: [], totalActions: 0, shownActions: 0 },
  summary: { ...baseSummary, ...(over.summaryOver ?? {}) },
  findings: [],
  evalResults: null,
  fixHistory: [],
  documentContents: [],
  ...over,
});

function tab(html: string, id: string): string {
  const m = html.match(new RegExp(`<div class="tab-content" id="tab-${id}"[^>]*>([\\s\\S]*?)(?=<div class="tab-content"|</body>)`, 'i'));
  return m ? m[1] : '';
}

describe('V1-M30.5 W-1+W-2: Documents file:// links use projectPath, not process.cwd()', () => {
  it('relative outputFile resolves under summary.projectPath', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    // Cast to allow optional projectPath field; the type extension is part of the fix
    const report = makeReport({ summaryOver: { projectPath: '/tmp/myproj/eval-target' } as Partial<ReportSummary> });
    const html = generateReportHtml(report);
    const t = tab(html, 'documents');
    // V1-M30.8b TD-63: ai-literacy replaces fria (filtered for limited-risk).
    expect(t).toMatch(/<a[^>]+href="file:\/\/\/tmp\/myproj\/eval-target\/docs\/compliance\/ai-literacy-policy\.md"/);
  });

  it('absolute outputFile (starts with /) is preserved as-is', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const report = makeReport({ summaryOver: { projectPath: '/tmp/myproj/eval-target' } as Partial<ReportSummary> });
    const html = generateReportHtml(report);
    const t = tab(html, 'documents');
    expect(t).toMatch(/<a[^>]+href="file:\/\/\/abs\/path\/risk\.md"/);
  });

  it('does NOT use process.cwd() when summary.projectPath is set', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const report = makeReport({ summaryOver: { projectPath: '/tmp/myproj/eval-target' } as Partial<ReportSummary> });
    const html = generateReportHtml(report);
    const t = tab(html, 'documents');
    // The renderer's old behaviour was to prefix with process.cwd() — verify that
    // the engine's CWD does NOT appear in the rendered Documents links when
    // projectPath is provided.
    const cwd = process.cwd();
    // V1-M30.8b TD-63: ai-literacy replaces fria (filtered for limited-risk).
    expect(t).not.toMatch(new RegExp(`<a[^>]+href="file://${cwd}/docs/compliance/ai-literacy-policy\\.md"`));
  });
});

describe('V1-M30.5 W-1: report-builder populates summary.projectPath from scanResult', () => {
  it('buildComplianceReport copies scanResult.projectPath into summary.projectPath', async () => {
    const { buildComplianceReport } = await import('./report-builder.js');
    const out = buildComplianceReport({
      scanResult: {
        projectPath: '/tmp/scan-project',
        score: 70,
        findings: [],
        scannedAt: '2026-04-29T10:00:00Z',
        duration: 1000,
        filesScanned: 0,
      } as never,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.10.0',
    } as never);
    expect((out.summary as ReportSummary & { projectPath?: string | null }).projectPath).toBe('/tmp/scan-project');
  });
});

describe('V1-M30.5 W-3: Actions tab renders ALL actions (no command-dedup drop)', () => {
  const fiveActions: readonly PriorityAction[] = Object.freeze([
    { rank: 1, source: 'obligation', id: 'OBL-001', title: 'First Obligation', article: 'Art. 26',
      severity: 'high', deadline: '2026-08-02', daysLeft: 95, scoreImpact: 8, fixAvailable: false,
      command: 'manual review', priorityScore: 90 },
    { rank: 2, source: 'obligation', id: 'OBL-002', title: 'Second Obligation', article: 'Art. 27',
      severity: 'high', deadline: '2026-08-02', daysLeft: 95, scoreImpact: 7, fixAvailable: false,
      command: 'manual review', priorityScore: 89 }, // SAME command, different action
    { rank: 3, source: 'scan', id: 'l2-fria', title: 'FRIA scaffold', article: 'Art. 27',
      severity: 'medium', deadline: null, daysLeft: null, scoreImpact: 5, fixAvailable: true,
      command: 'complior fix', priorityScore: 70 },
    { rank: 4, source: 'passport', id: 'pp-init', title: 'Complete passport for eval-target', article: 'Art. 11',
      severity: 'high', deadline: null, daysLeft: null, scoreImpact: 6, fixAvailable: false,
      command: 'manual review', priorityScore: 60 }, // SAME command again
    { rank: 5, source: 'scan', id: 'l4-bare-llm', title: 'Bare LLM detected', article: 'Art. 13',
      severity: 'low', deadline: null, daysLeft: null, scoreImpact: 3, fixAvailable: true,
      command: 'complior fix', priorityScore: 40 }, // SAME command again
  ]);

  it('all 5 distinct actions render (none collapsed by command-dedup)', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const report = makeReport({
      actionPlan: { actions: fiveActions, totalActions: 5, shownActions: 5 },
    });
    const html = generateReportHtml(report);
    const t = tab(html, 'actions');
    // Each rank #1..#5 must appear in the rendered HTML
    for (const rank of [1, 2, 3, 4, 5]) {
      expect(t, `rank #${rank} should be in actions tab`).toMatch(new RegExp(`data-rank="${rank}"`));
    }
  });

  it('every action gets the correct emoji prefix on its title', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const report = makeReport({
      actionPlan: { actions: fiveActions, totalActions: 5, shownActions: 5 },
    });
    const html = generateReportHtml(report);
    const t = tab(html, 'actions');
    // 2 obligations → 2 📋
    expect((t.match(/📋/g) ?? []).length).toBe(2);
    // 2 scans → 2 🔍
    expect((t.match(/🔍/g) ?? []).length).toBe(2);
    // 1 passport → 1 🤖
    expect((t.match(/🤖/g) ?? []).length).toBe(1);
  });
});

describe('V1-M30.5 W-4: MD renderer humanizes generation timestamp', () => {
  it('generateComplianceMd does NOT contain raw ISO datetime in the "Generated" line', async () => {
    const { generateComplianceMd } = await import('./compliance-md.js');
    const scanResult = {
      score: { totalScore: 70, zone: 'yellow' as const, breakdown: {} },
      findings: [],
      scannedAt: '2026-04-29T14:55:36.976Z',
      duration: 1000,
      filesScanned: 0,
      projectPath: '/tmp/proj',
    };
    const md = generateComplianceMd(scanResult as never, '0.10.0-test');
    // The "Generated by Complior on …" line MUST contain the humanized date,
    // NOT the raw ISO timestamp.
    const headerLine = md.split('\n').find((l) => l.includes('Generated')) ?? '';
    expect(headerLine).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/);
    // Has humanized form: "Month D, YYYY at HH:MM UTC"
    expect(headerLine).toMatch(/[A-Z][a-z]+\s+\d{1,2},\s+\d{4}\s+at\s+\d{2}:\d{2}\s+UTC/);
  });
});
