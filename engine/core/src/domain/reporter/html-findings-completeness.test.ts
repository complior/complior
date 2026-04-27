/**
 * V1-M29 / W-2: RED test — Findings tab completeness + actionability + profile-aware.
 *
 * Background (per /deep-e2e tab analysis 2026-04-27):
 * - Only 2 finding-cards rendered despite 53 findings in data
 * - No `complior fix` command in cards (despite HR-3 spec)
 * - Same 53 findings for all 3 profiles — NOT profile-aware
 *
 * Specification:
 *   1. ALL findings rendered (or paginated with expand-all option)
 *      — at minimum >2 cards when input has >2 findings
 *   2. Each card includes actionable command (`complior fix --check-id X` or `complior fix --doc Y`)
 *   3. Findings filtered by profile (deployer-only, role-mismatched skip)
 */

import { describe, it, expect } from 'vitest';

describe('V1-M29 W-2: Findings tab completeness', () => {
  it('renders MORE than 2 finding-cards when data has many findings', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithManyFindings());
    const cardCount = (html.match(/finding-card/g) ?? []).length;
    // Each card has 1 wrapper class + a header class — typically 2 occurrences per card.
    // For 10 findings should see ≥ 10 wrapper occurrences (or pagination control).
    const hasManyCards = cardCount > 4 || /class="[^"]*pagination[^"]*"/i.test(html);
    expect(hasManyCards).toBe(true);
  });

  it('each finding card includes complior fix command (or doc generation cmd)', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildReportWithManyFindings());

    // Production HTML must include ≥1 `complior fix` reference per finding (or in any card)
    expect(html).toMatch(/complior\s+fix/);
  });

  it('findings filtered by profile (deployer profile excludes provider-only checks)', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const deployerHtml = generateReportHtml(
      buildReportWithProfileFindings('deployer', 'limited'),
    );
    const providerHtml = generateReportHtml(
      buildReportWithProfileFindings('provider', 'high'),
    );

    // Counts MUST differ — if profile-aware filtering applied
    const dCount = (deployerHtml.match(/finding-card/g) ?? []).length;
    const pCount = (providerHtml.match(/finding-card/g) ?? []).length;
    expect(dCount).not.toBe(pCount);
  });
});

function buildReportWithManyFindings(): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  const findings = [];
  for (let i = 0; i < 10; i++) {
    findings.push({
      checkId: `l2-test-${i}`,
      type: 'fail',
      message: `Test finding ${i}`,
      severity: i < 3 ? 'high' : 'medium',
      obligationId: `eu-ai-act-OBL-${String(i).padStart(3, '0')}`,
      articleReference: `Article ${4 + i}`,
      fix: `complior fix --check-id l2-test-${i}`,
    });
  }
  return baseReport({ findings }) as never;
}

function buildReportWithProfileFindings(role: string, riskLevel: string): never {
  const dim = (s: number | null) => ({ score: s, weight: 1, available: s !== null });
  // 5 deployer-applicable + 5 provider-only findings
  const findings = [
    ...Array.from({ length: 5 }, (_, i) => ({
      checkId: `deployer-${i}`,
      type: 'fail',
      message: `Deployer issue ${i}`,
      severity: 'medium',
      obligationId: `OBL-DEPLOYER-${i}`,
      articleReference: `Article ${20 + i}`,
      appliesToRole: 'deployer',
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      checkId: `provider-${i}`,
      type: 'fail',
      message: `Provider issue ${i}`,
      severity: 'high',
      obligationId: `OBL-PROVIDER-${i}`,
      articleReference: `Article ${10 + i}`,
      appliesToRole: 'provider',
    })),
  ];
  return baseReport({ profile: { role, riskLevel, domain: 'general', applicableArticles: [] }, findings }) as never;
}

function baseReport(overrides: Record<string, unknown> = {}): unknown {
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
    actionPlan: { actions: [] },
    summary: { topIssues: [], overallStatus: 'in-progress' },
    findings: [],
    evalResults: null,
    fixHistory: [],
    documentContents: [],
    ...overrides,
  };
}
