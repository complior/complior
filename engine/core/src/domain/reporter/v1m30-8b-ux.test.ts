/**
 * V1-M30.8b / W-2..W-5: RED — UX polish for HTML report.
 *
 *   W-2: action title truncation (long titles → ellipsis + <details>)
 *   W-3: doc Modified line hidden for scaffold-status docs
 *   W-4: documents disclaimer prose improvement (no cryptic "Excluded: Art. 27")
 *   W-5: laws cross-domain obligations get <details> explainer for general profile
 */

import { describe, it, expect } from 'vitest';
import type {
  ComplianceReport,
  PriorityAction,
  DocumentStatus,
  ObligationDetail,
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

describe('V1-M30.8b W-2: long action titles truncated with <details> expand', () => {
  it('action title > 100 chars rendered as truncated + details', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const longTitle = 'While the template lists 8 fundamental rights (Arts. 1, 7, 8, 11, 21, 24, 31, 41, 47), the actual document content is incomplete and needs significant work to be compliant.';
    const action: PriorityAction = {
      rank: 1, source: 'scan', id: 'l5-doc-fria', title: longTitle, article: 'Art. 27',
      severity: 'medium', deadline: null, daysLeft: null, scoreImpact: 5, fixAvailable: true,
      command: 'complior fix --check-id l5-doc-fria', priorityScore: 70,
    };
    const report = baseReport({
      actionPlan: { actions: [action], totalActions: 1, shownActions: 1 },
    });
    const html = generateReportHtml(report);
    const aTab = tab(html, 'actions');
    // Title cell must contain ellipsis (truncated)
    expect(aTab).toMatch(/…|\.\.\./);
    // Full text must be inside a <details> element
    expect(aTab).toMatch(/<details[\s\S]*?fundamental rights[\s\S]*?<\/details>/);
  });

  it('action title <= 100 chars rendered as plain (no <details>)', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const action: PriorityAction = {
      rank: 1, source: 'scan', id: 'l5-doc-fria', title: 'FRIA scaffold incomplete',
      article: 'Art. 27', severity: 'medium', deadline: null, daysLeft: null,
      scoreImpact: 5, fixAvailable: true, command: 'complior fix', priorityScore: 70,
    };
    const report = baseReport({
      actionPlan: { actions: [action], totalActions: 1, shownActions: 1 },
    });
    const html = generateReportHtml(report);
    const aTab = tab(html, 'actions');
    // Short title NOT wrapped in <details>
    expect(aTab).toMatch(/FRIA scaffold incomplete/);
    // No <details> in this short-title row (other actions may have details though)
    const rowMatch = aTab.match(/<tr[^>]*data-rank="1"[\s\S]*?<\/tr>/);
    expect(rowMatch?.[0] ?? '').not.toMatch(/<details/);
  });
});

describe('V1-M30.8b W-3: doc Modified line hidden for scaffold-status docs', () => {
  // V1-M30.8b W-3 test fixture FIX: previously used FRIA (Art. 27) but the
  // V1-M30.6 W-1.2 risk-level filter excludes FRIA from the documents tab
  // for limited-risk profiles (which baseReport defaults to). The fixture
  // never rendered a doc-card → test was vacuously passing/failing.
  // Switched to ai-literacy (Art. 4) which is universally applicable to all
  // profiles. The W-3 invariant under test (Modified: hidden for scaffold,
  // shown for draft) is doc-type-agnostic.
  const baseDoc: DocumentStatus = {
    docType: 'ai-literacy', article: 'Art. 4', description: 'AI Literacy',
    outputFile: '/abs/path/ai-literacy-policy.md', status: 'scaffold', scoreImpact: 5,
    prefilledPercent: null, lastModified: '2026-04-30T10:00:00Z',
    templateFile: null,
  };

  it('scaffold doc does NOT render Modified: line', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const report = baseReport({
      documents: {
        total: 1, byStatus: { missing: 0, scaffold: 1, draft: 0, reviewed: 0 },
        score: 0, excludedCount: 0, documents: [baseDoc],
      } as never,
    });
    const html = generateReportHtml(report);
    const dTab = tab(html, 'documents');
    // Find the ai-literacy doc-card
    const card = dTab.match(/<div class="doc-card">[\s\S]*?ai-literacy[\s\S]*?(?=<div class="doc-card"|<div class="docs-disclaimer"|$)/i);
    expect(card, 'ai-literacy doc-card must be rendered (not filtered)').not.toBeNull();
    expect(card![0]).not.toMatch(/Modified:/);
  });

  it('draft doc with prefilledPercent renders Modified: line', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const draftDoc: DocumentStatus = { ...baseDoc, status: 'draft', prefilledPercent: 30 };
    const report = baseReport({
      documents: {
        total: 1, byStatus: { missing: 0, scaffold: 0, draft: 1, reviewed: 0 },
        score: 0, excludedCount: 0, documents: [draftDoc],
      } as never,
    });
    const html = generateReportHtml(report);
    const dTab = tab(html, 'documents');
    expect(dTab).toMatch(/Modified:/);
  });
});

describe('V1-M30.8b W-4: documents disclaimer prose improvement', () => {
  it('disclaimer mentions FRIA name (not just "Art. 27") AND no trailing " . "', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    // Profile A: limited risk → FRIA excluded; deployer → Declaration excluded
    // baseReport defaults to deployer/limited so this profile excludes both
    const docs: DocumentStatus[] = [
      { docType: 'ai-literacy', article: 'Art. 4', description: 'AI Literacy',
        outputFile: '/p/ai-literacy.md', status: 'draft', scoreImpact: 5,
        prefilledPercent: 50, lastModified: null, templateFile: null },
      // FRIA and Declaration kept in source data so they show in disclaimer-as-excluded
      { docType: 'fria', article: 'Art. 27', description: 'FRIA',
        outputFile: '/p/fria.md', status: 'scaffold', scoreImpact: 5,
        prefilledPercent: null, lastModified: null, templateFile: null },
      { docType: 'declaration-of-conformity', article: 'Art. 47',
        description: 'Declaration', outputFile: '/p/dec.md', status: 'scaffold',
        scoreImpact: 5, prefilledPercent: null, lastModified: null, templateFile: null },
    ];
    const report = baseReport({
      documents: {
        total: 3, byStatus: { missing: 0, scaffold: 2, draft: 1, reviewed: 0 },
        score: 50, excludedCount: 2, documents: docs,
      } as never,
    });
    const html = generateReportHtml(report);
    const dTab = tab(html, 'documents');
    // Must mention BOTH excluded docs by name in the disclaimer
    const disc = dTab.match(/<div class="docs-disclaimer">[\s\S]*?<\/div>/);
    expect(disc, 'documents disclaimer must be present').not.toBeNull();
    const discText = disc![0];
    // FRIA mentioned with full label, not bare "Art. 27"
    expect(discText).toMatch(/FRIA[^<]*Art\.?\s*27/i);
    expect(discText).toMatch(/Declaration of Conformity[^<]*provider.only/i);
    // No trailing " . " (space-dot-space) artifact
    expect(discText).not.toMatch(/\s\.\s\./);
  });
});

describe('V1-M30.8b W-5: laws cross-domain obligations get explainer for general profile', () => {
  it('healthcare-prefixed obligation in general profile gets <details> "Why is this listed?"', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const obligation: ObligationDetail = {
      id: 'OBL-MED-003',
      article: 'Annex III + GDPR Art. 9',
      title: 'Healthcare: AI Processing Health Data — Special Category',
      role: 'both',
      severity: 'high',
      deadline: '2026-08-02',
      covered: false,
      linkedChecks: [],
    };
    const report = baseReport({
      profile: { role: 'deployer', riskLevel: 'limited', domain: 'general' },
      obligations: {
        total: 1, covered: 0, uncovered: 1, coveragePercent: 0, excludedCount: 0,
        critical: [],
        byArticle: [{
          article: 'Annex III + GDPR Art. 9',
          total: 1, covered: 0,
          obligations: [obligation],
        }],
      },
    });
    const html = generateReportHtml(report);
    const lTab = tab(html, 'laws');
    // The obligation must appear AND have a <details> with cross-domain reasoning nearby
    expect(lTab).toMatch(/OBL-MED-003/);
    // Look for explainer details near OBL-MED-003
    const block = lTab.match(/OBL-MED-003[\s\S]{0,500}/);
    expect(block?.[0] ?? '').toMatch(/<details[\s\S]*?(GDPR|all domains|cross.?domain|special category)/i);
  });
});
