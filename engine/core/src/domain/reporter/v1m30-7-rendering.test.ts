/**
 * V1-M30.7 RED — 4 critical UI rendering bugs found in true 100% deep verification.
 *
 *   W-1: Passport completeness `22%%` (double percent) → must be single `%`
 *   W-2: Passport intro says `/ 36 total` but data has 37 → reconcile to 37
 *   W-3: Action `command: 'manual review'` rendered as `<code>` → must be muted span
 *   W-4: `Skipped:` fix plans appear in "Available Fix Plans" → must be filtered out
 */

import { describe, it, expect } from 'vitest';
import type {
  ComplianceReport,
  PassportDetail,
  PriorityAction,
  FindingSummary,
} from './types.js';

const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });

const baseReport = (over: Partial<ComplianceReport> = {}): ComplianceReport => ({
  generatedAt: '2026-04-30T10:00:00Z',
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
  documents: { total: 0, byStatus: { missing: 0, scaffold: 0, draft: 0, reviewed: 0 }, score: 0, excludedCount: 0, documents: [] } as never,
  obligations: { total: 0, covered: 0, uncovered: 0, coveragePercent: 0, byArticle: [], critical: [], excludedCount: 0 },
  passports: { totalAgents: 0, passports: [], averageCompleteness: 0 },
  actionPlan: { actions: [], totalActions: 0, shownActions: 0 },
  summary: {
    readinessScore: 70, zone: 'yellow' as const, scanScore: 75, evalScore: 80,
    documentsTotal: 0, documentsReviewed: 0, obligationsTotal: 0, obligationsCovered: 0,
    passportsTotal: 0, passportsComplete: 0, evidenceChainLength: 0, evidenceVerified: true,
    totalFindings: 0, criticalFindings: 0, autoFixable: 0,
    daysUntilEnforcement: 95, enforcementDate: '2026-08-02',
    generatedAt: '2026-04-30T10:00:00Z', compliorVersion: '0.10.0-test',
  },
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

const samplePassport: PassportDetail = {
  name: 'eval-target-anthropic',
  completeness: 22,
  completenessZone: 'red' as const,
  filledFields: 8,
  totalFields: 37,
  missingFields: ['provider', 'organization', 'risk_class'],
  friaCompleted: false,
  signed: true,
  lastUpdated: '2026-04-30T10:00:00Z',
};

describe('V1-M30.7 W-1: passport completeness has single % (not double)', () => {
  it('renders 22% (one percent), not 22%%', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const report = baseReport({
      passports: { totalAgents: 1, passports: [samplePassport], averageCompleteness: 22 },
    });
    const html = generateReportHtml(report);
    const ppTab = tab(html, 'passports');
    // Bug: ${pct(p.completeness)}% adds extra % because pct() already adds it.
    expect(ppTab).not.toMatch(/\d+%%/);
    // After fix: must contain "22%" (single %) at least once in pp-ring-val
    expect(ppTab).toMatch(/<div class="pp-ring-val">\s*22%\s*<\/div>/);
  });

  it('renders Completeness label with single %', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const report = baseReport({
      passports: { totalAgents: 1, passports: [samplePassport], averageCompleteness: 22 },
    });
    const html = generateReportHtml(report);
    const ppTab = tab(html, 'passports');
    expect(ppTab).toMatch(/Completeness:\s*22%(?!%)/);
  });
});

describe('V1-M30.7 W-2: passport intro says /37 total (matching data)', () => {
  it('intro and Completeness denominator agree on 37 (or both on whatever count is canonical)', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const report = baseReport({
      passports: { totalAgents: 1, passports: [samplePassport], averageCompleteness: 22 },
    });
    const html = generateReportHtml(report);
    const ppTab = tab(html, 'passports');
    // The "/ 36 total" hardcoded literal MUST NOT appear if data uses 37.
    expect(ppTab).not.toMatch(/\/\s*36\s+total/i);
    // The intro must reference the same count as the data: 37.
    expect(ppTab).toMatch(/\/\s*37\s+total/);
    // The fields breakdown must show the same denominator as totalFields=37.
    expect(ppTab).toMatch(/Completeness:\s*8\/37\s+fields/);
  });
});

describe('V1-M30.7 W-3: actions with manual command not rendered as <code>', () => {
  it('manual review command rendered as muted span, not <code>', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const action: PriorityAction = {
      rank: 1, source: 'obligation', id: 'OBL-001', title: 'Inform Workers', article: 'Art. 26',
      severity: 'high', deadline: '2026-08-02', daysLeft: 95, scoreImpact: 8, fixAvailable: false,
      command: 'manual review', priorityScore: 90,
    };
    const report = baseReport({
      actionPlan: { actions: [action], totalActions: 1, shownActions: 1 },
    });
    const html = generateReportHtml(report);
    const aTab = tab(html, 'actions');
    // Must NOT render manual review as a <code> element (which suggests a runnable command)
    expect(aTab).not.toMatch(/<code[^>]*>\s*manual review\s*<\/code>/);
    // Must render as a muted span instead
    expect(aTab).toMatch(/<span[^>]+class="[^"]*muted[^"]*"[^>]*>\s*manual review\s*<\/span>/);
  });

  it('CLI commands ARE rendered as <code> still', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const action: PriorityAction = {
      rank: 1, source: 'scan', id: 'l2-fria', title: 'FRIA scaffold', article: 'Art. 27',
      severity: 'medium', deadline: null, daysLeft: null, scoreImpact: 5, fixAvailable: true,
      command: 'complior fix --check-id l2-fria', priorityScore: 70,
    };
    const report = baseReport({
      actionPlan: { actions: [action], totalActions: 1, shownActions: 1 },
    });
    const html = generateReportHtml(report);
    const aTab = tab(html, 'actions');
    // Real CLI commands stay in <code>
    expect(aTab).toMatch(/<code[^>]*>[^<]*complior fix --check-id l2-fria[^<]*<\/code>/);
  });
});

describe('V1-M30.7 W-4: Skipped fix plans not in "Available Fix Plans"', () => {
  it('fix plan with message starting with "Skipped:" filtered from available list', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const findings: FindingSummary[] = [
      {
        checkId: 'l2-fria', type: 'fail', message: 'FRIA scaffold incomplete',
        severity: 'medium', layer: 'L2', fixAvailable: true,
      },
      {
        checkId: 'l2-monitoring-policy', type: 'skip',
        message: 'Skipped: not applicable for limited risk level (obligation requires different risk classification)',
        severity: 'medium', layer: 'L2', fixAvailable: false,
      },
    ];
    const report = baseReport({ findings });
    const html = generateReportHtml(report);
    const fxTab = tab(html, 'fixes');

    // Locate the "Available Fix Plans" section. Use a generous capture between
    // the heading and the next h2/h3 or end of tab.
    const avail = fxTab.match(/Available Fix Plans[\s\S]+?(?=<h\d|<\/div>\s*<\/div>\s*$|$)/);
    const availSection = avail?.[0] ?? '';

    // l2-fria SHOULD be in available
    expect(availSection).toMatch(/l2-fria/);
    // l2-monitoring-policy (Skipped) MUST NOT be in available
    expect(availSection).not.toMatch(/l2-monitoring-policy/);
  });
});
