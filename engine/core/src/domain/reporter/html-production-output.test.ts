/**
 * V1-M24 / R-3, R-4, R-5: RED tests — production HTML output (generateReportHtml)
 * must satisfy V1-M22 A-2/A-3/A-5 spec at the REAL render path users see.
 *
 * Background:
 *   V1-M22 A-2/A-3/A-5 unit tests targeted `buildHtmlReport()` (a builder fn)
 *   and passed against mock data. But production HTML invocation goes through
 *   `generateReportHtml(report)` in `html-renderer.ts` — DIFFERENT module.
 *
 *   V1-M21 final E2E found:
 *     $ grep -oE '\$[0-9]' generated.html → 3 matches (R-3 / A-2 fail)
 *     $ grep -E 'company-profile' generated.html → 0 matches (R-4 / A-3 fail)
 *     $ grep -E '\[YYYY\]|\[NNN\]' generated.html → matches (R-5 / A-5 fail)
 *
 *   Lesson: unit test a builder fn ≠ production rendering invariants.
 *   These tests target the REAL `generateReportHtml` users see.
 *
 * Specification:
 *   - generateReportHtml(report) output has 0 `$N` placeholder matches
 *   - generateReportHtml(report) output contains company-profile section
 *     when report has profile data
 *   - generateReportHtml(report) output substitutes real document IDs (not [YYYY]/[NNN])
 *
 * Architecture:
 *   - Tests call REAL renderer with REAL ComplianceReport shape
 *   - Assertions on actual HTML string (string-search invariants)
 *   - No mocks of intermediate builders
 */

import { describe, it, expect } from 'vitest';

describe('V1-M24 / R-3: production HTML has 0 `$N` placeholders', () => {
  it('generateReportHtml output has no `$1`, `$2`, ... `$9` matches', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildFullReport());

    const placeholders = html.match(/\$[0-9]/g) ?? [];
    expect(placeholders).toEqual([]);
  });

  it('generateReportHtml has no `{{var}}` mustache leftovers', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildFullReport());

    expect(html).not.toMatch(/\{\{[A-Za-z_][A-Za-z0-9_]*\}\}/);
  });
});

describe('V1-M24 / R-4: buildComplianceReport must include profile in output', () => {
  it('buildComplianceReport surfaces profile from input to output', async () => {
    const { buildComplianceReport } = await import('./report-builder.js');

    const built = buildComplianceReport({
      scanResult: null,
      evalScore: null,
      passports: [],
      obligations: [],
      evidenceSummary: null,
      version: '0.10.0-test',
      projectRole: 'provider',
      scanModeScores: {},
      // The CompanyProfile object MUST be a recognized ReportBuildInput field,
      // and must surface to ComplianceReport.profile in output.
      profile: {
        role: 'provider',
        riskLevel: 'high',
        domain: 'healthcare',
        applicableArticles: ['Art. 6', 'Art. 9', 'Art. 27'],
      },
    } as never);

    expect(built.profile).toBeDefined();
    expect(built.profile?.role).toBe('provider');
    expect(built.profile?.domain).toBe('healthcare');
  });
});

describe('V1-M24 / R-4 (renderer): production HTML includes company profile block', () => {
  it('generated HTML contains company-profile section anchor', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildFullReport());

    // Anchor: id="company-profile" OR id="project-profile" OR heading text
    const hasSection =
      /id=["']?(company|project)-profile["']?/i.test(html) ||
      /<h[1-3][^>]*>\s*(Company|Project)\s+Profile\s*</i.test(html);

    expect(hasSection).toBe(true);
  });

  it('profile section renders role from report', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildFullReport());

    expect(html.toLowerCase()).toMatch(/provider|deployer|both/);
  });

  it('profile section renders risk level', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildFullReport());

    expect(html.toLowerCase()).toMatch(/high|limited|minimal|unacceptable/);
  });

  it('profile section renders industry domain', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildFullReport());

    expect(html.toLowerCase()).toContain('healthcare');
  });

  it('profile section shows applicable EU AI Act articles', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildFullReport());

    // At least one Art. N reference
    expect(html).toMatch(/Art\.?\s*\d+/);
  });
});

describe('V1-M24 / R-5: production HTML substitutes/filters [YYYY]/[NNN] placeholders in embedded doc content', () => {
  it('embedded markdown documentContents have no `[YYYY]` placeholder leak', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const reportWithScaffoldedDocs = buildReportWithScaffoldedMarkdown();
    const html = generateReportHtml(reportWithScaffoldedDocs);

    // V1-M21 found: `Document ID: WRK-[YYYY]-[NNN]` leaks from scaffold template
    // into the rendered HTML when document is embedded but unsubstituted.
    expect(html).not.toMatch(/\[YYYY\]/);
  });

  it('embedded markdown has no `[NNN]` placeholders', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const reportWithScaffoldedDocs = buildReportWithScaffoldedMarkdown();
    const html = generateReportHtml(reportWithScaffoldedDocs);

    expect(html).not.toMatch(/\[NNN\]/);
  });

  it('substituted real doc IDs (TDD-YYYY-NNN format) appear in HTML', async () => {
    const { generateReportHtml } = await import('./html-renderer.js');
    const html = generateReportHtml(buildFullReport());

    // Format: TDD-2026-001, INC-2026-001, etc.
    expect(html).toMatch(/[A-Z]{3,4}-20\d{2}-\d{3}/);
  });
});

/**
 * Build a report with scaffold-style markdown content that contains
 * `[YYYY]/[NNN]` template placeholders. This mirrors what real users see
 * when scaffolded docs (WRK, DGP, INC etc.) haven't been substituted.
 */
function buildReportWithScaffoldedMarkdown(): never {
  const base = buildFullReport() as unknown as Record<string, unknown>;
  // Renderer only embeds documentContents whose docType matches a doc card
  // in documents.documents — must add both for [YYYY] to actually leak.
  return {
    ...base,
    documents: {
      total: 2,
      byStatus: { missing: 0, scaffold: 1, draft: 1, reviewed: 0 },
      documents: [
        {
          docType: 'worker-notification',
          article: 'Art. 26(7)',
          description: 'Worker Notification',
          outputFile: 'docs/WORKER-NOTIFICATION.md',
          status: 'scaffold',
          scoreImpact: 5,
          prefilledPercent: 0,
          lastModified: '2026-04-25T00:00:00Z',
          templateFile: 'templates/wrk.md',
        },
        {
          docType: 'data-governance-policy',
          article: 'Art. 10',
          description: 'Data Governance Policy',
          outputFile: 'docs/DATA-GOVERNANCE-POLICY.md',
          status: 'draft',
          scoreImpact: 5,
          prefilledPercent: 0,
          lastModified: '2026-04-25T00:00:00Z',
          templateFile: 'templates/dgp.md',
        },
      ],
    },
    documentContents: [
      {
        docType: 'worker-notification',
        article: 'Art. 26(7)',
        path: 'docs/WORKER-NOTIFICATION.md',
        content: '# Worker Notification\n\n**Document ID**: WRK-[YYYY]-[NNN]\n\n...',
      },
      {
        docType: 'data-governance-policy',
        article: 'Art. 10',
        path: 'docs/DATA-GOVERNANCE-POLICY.md',
        content: '# Data Governance Policy\n\n**Document ID**: DGP-[YYYY]-[NNN]\n\n...',
      },
    ],
  } as never;
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Build a minimal ComplianceReport matching real shape from
 * engine/core/src/domain/reporter/types.ts (interface ComplianceReport).
 * Includes profile + documents to drive the real render path.
 */
function buildFullReport(): never {
  const dim = (score: number | null) => ({ score, weight: 1, available: score !== null });
  return {
    generatedAt: '2026-04-25T12:00:00Z',
    compliorVersion: '0.10.0-test',
    profile: {
      role: 'provider',
      riskLevel: 'high',
      domain: 'healthcare',
      applicableArticles: ['Art. 6', 'Art. 9', 'Art. 11', 'Art. 14', 'Art. 27'],
    },
    readiness: {
      readinessScore: 75,
      zone: 'yellow' as const,
      dimensions: {
        scan: dim(75),
        scanSecurity: dim(80),
        scanLlm: dim(null),
        docs: dim(60),
        documents: dim(60),
        passports: dim(70),
        eval: dim(null),
        evidence: dim(null),
      },
      trend: null,
      criticalCaps: [],
      daysUntilEnforcement: 100,
    },
    documents: {
      total: 2,
      byStatus: { missing: 0, scaffold: 0, draft: 1, reviewed: 1 },
      documents: [
        {
          id: 'TDD-2026-001',
          docType: 'technical-documentation',
          article: 'Art. 11',
          description: 'Technical Documentation',
          outputFile: 'docs/TECH-DOCUMENTATION.md',
          status: 'reviewed',
          scoreImpact: 5,
          prefilledPercent: 85,
          lastModified: '2026-04-25T00:00:00Z',
          templateFile: null,
        },
        {
          id: 'FRIA-2026-001',
          docType: 'fria',
          article: 'Art. 27',
          description: 'FRIA',
          outputFile: '.complior/fria/test-fria.md',
          status: 'draft',
          scoreImpact: 5,
          prefilledPercent: 60,
          lastModified: '2026-04-25T00:00:00Z',
          templateFile: null,
        },
      ],
    },
    obligations: { total: 108, covered: 50, uncovered: 58, byArticle: [] },
    passports: { totalAgents: 0, averageCompleteness: 0, passports: [] },
    actionPlan: { actions: [] },
    summary: { topIssues: [], overallStatus: 'in-progress' },
    findings: [],
    evalResults: null,
    fixHistory: [],
    documentContents: [],
  } as never;
}
