/**
 * Report HTML Renderer — acceptance tests
 *
 * V1-M01 RED spec: validates that generateReportHtml produces valid HTML
 * with all required sections for the compliance report.
 *
 * The HTML renderer has 1000+ lines of inline HTML/CSS generation
 * and currently has ZERO test coverage. These tests ensure correctness.
 */
import { describe, it, expect } from 'vitest';
import { generateReportHtml } from './html-renderer.js';
import type {
  ComplianceReport,
  ReadinessDashboard,
  DocumentInventory,
  ObligationCoverage,
  PassportStatusSection,
  PriorityActionPlan,
  ReportSummary,
} from './types.js';

// --- Minimal valid report fixture ---
const createMinimalReport = (overrides?: Partial<ComplianceReport>): ComplianceReport => ({
  generatedAt: '2026-04-10T12:00:00.000Z',
  compliorVersion: '1.0.0',
  readiness: {
    readinessScore: 42,
    zone: 'yellow',
    dimensions: {
      scan: { score: 55, weight: 0.35, available: true },
      scanSecurity: { score: null, weight: 0, available: false },
      scanLlm: { score: null, weight: 0, available: false },
      documents: { score: 30, weight: 0.25, available: true },
      passports: { score: 50, weight: 0.15, available: true },
      eval: { score: null, weight: 0, available: false },
      evidence: { score: 80, weight: 0.10, available: true },
    },
    trend: null,
    criticalCaps: [],
    daysUntilEnforcement: 114,
  },
  documents: {
    total: 8,
    byStatus: { missing: 4, scaffold: 2, draft: 1, reviewed: 1 },
    score: 30,
    documents: [
      {
        docType: 'fria',
        article: 'Art. 27',
        description: 'Fundamental Rights Impact Assessment',
        outputFile: '.complior/docs/fria.md',
        status: 'scaffold',
        scoreImpact: 15,
        prefilledPercent: 25,
        lastModified: null,
        templateFile: 'fria.md',
      },
    ],
  },
  obligations: {
    total: 108,
    covered: 45,
    uncovered: 63,
    coveragePercent: 41.7,
    byArticle: [],
    critical: [],
  },
  passports: {
    totalAgents: 1,
    passports: [
      {
        name: 'test-agent',
        completeness: 60,
        completenessZone: 'yellow',
        filledFields: 22,
        totalFields: 36,
        missingFields: ['model_version', 'training_data'],
        friaCompleted: false,
        signed: true,
        lastUpdated: '2026-04-10T12:00:00.000Z',
      },
    ],
    averageCompleteness: 60,
  },
  actionPlan: {
    actions: [
      {
        rank: 1,
        source: 'scan',
        id: 'bare-llm-openai',
        title: 'Wrap OpenAI client with complior()',
        article: 'Art. 50',
        severity: 'high',
        deadline: '2026-08-02',
        daysLeft: 114,
        scoreImpact: 8,
        fixAvailable: true,
        command: 'complior fix',
        priorityScore: 100,
      },
    ],
    totalActions: 1,
    shownActions: 1,
  },
  summary: {
    readinessScore: 42,
    zone: 'yellow',
    scanScore: 55,
    evalScore: null,
    documentsTotal: 8,
    documentsReviewed: 1,
    obligationsTotal: 108,
    obligationsCovered: 45,
    passportsTotal: 1,
    passportsComplete: 0,
    evidenceChainLength: 3,
    evidenceVerified: true,
    totalFindings: 12,
    criticalFindings: 2,
    autoFixable: 5,
    daysUntilEnforcement: 114,
    enforcementDate: '2026-08-02',
    generatedAt: '2026-04-10T12:00:00.000Z',
    compliorVersion: '1.0.0',
  },
  findings: [
    {
      checkId: 'bare-llm-openai',
      type: 'fail',
      message: 'Bare OpenAI client detected without complior() wrapper',
      severity: 'high',
      file: 'src/chat.ts',
      line: 42,
      articleReference: 'Art. 50',
      fix: 'Wrap with complior(client)',
      fixAvailable: true,
      layer: 'L4',
    },
  ],
  evalResults: null,
  fixHistory: [],
  documentContents: [],
  ...overrides,
});

describe('generateReportHtml', () => {
  it('produces valid HTML document with DOCTYPE', () => {
    const html = generateReportHtml(createMinimalReport());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('<head>');
    expect(html).toContain('</head>');
    expect(html).toContain('<body');
  });

  it('includes Complior branding', () => {
    const html = generateReportHtml(createMinimalReport());
    expect(html).toContain('Complior');
  });

  it('renders readiness score and zone', () => {
    const html = generateReportHtml(createMinimalReport());
    // Score value should appear in the HTML
    expect(html).toContain('42');
    // Zone label should appear
    expect(html).toMatch(/CAUTION|yellow/i);
  });

  it('renders passport section with agent name', () => {
    const html = generateReportHtml(createMinimalReport());
    expect(html).toContain('test-agent');
    expect(html).toContain('60'); // completeness percentage
  });

  it('renders findings with check IDs', () => {
    const html = generateReportHtml(createMinimalReport());
    expect(html).toContain('bare-llm-openai');
    expect(html).toContain('src/chat.ts');
  });

  it('renders action plan items', () => {
    const html = generateReportHtml(createMinimalReport());
    expect(html).toContain('Wrap OpenAI');
    expect(html).toContain('Art. 50');
  });

  it('handles empty report gracefully (no crash)', () => {
    const emptyReport = createMinimalReport({
      findings: [],
      passports: { totalAgents: 0, passports: [], averageCompleteness: 0 },
      actionPlan: { actions: [], totalActions: 0, shownActions: 0 },
      evalResults: null,
      fixHistory: [],
      documentContents: [],
    });
    const html = generateReportHtml(emptyReport);
    expect(html).toContain('<!DOCTYPE html>');
    // Should not throw, should produce valid HTML even when empty
    expect(html.length).toBeGreaterThan(100);
  });

  it('renders eval results tab when eval data present', () => {
    const reportWithEval = createMinimalReport({
      evalResults: {
        overallScore: 78,
        grade: 'B',
        totalTests: 168,
        passed: 131,
        failed: 37,
        errors: 0,
        inconclusive: 0,
        skipped: 0,
        duration: 45000,
        categories: [
          {
            category: 'CT-1 Transparency',
            score: 85,
            grade: 'A',
            passed: 47,
            failed: 8,
            total: 55,
          },
        ],
        tests: [
          {
            testId: 'CT-1-001',
            category: 'Transparency',
            name: 'AI Disclosure Check',
            method: 'deterministic',
            verdict: 'pass',
            score: 85,
            confidence: 90,
            reasoning: 'AI system disclosed',
            probe: 'Does the system identify itself as AI?',
            response: 'Yes',
            latencyMs: 50,
            owaspCategory: undefined,
            severity: undefined,
          },
        ],
      },
    });
    const html = generateReportHtml(reportWithEval);
    expect(html).toContain('78'); // eval score
    expect(html).toContain('Transparency');
  });

  it('renders fix history entries', () => {
    const reportWithFixes = createMinimalReport({
      fixHistory: [
        {
          id: 1,
          checkId: 'bare-llm-openai',
          fixType: 'wrap',
          status: 'applied',
          timestamp: '2026-04-10T11:00:00.000Z',
          files: [{ path: 'src/chat.ts', action: 'modified' }],
          scoreBefore: 35,
          scoreAfter: 43,
        },
      ],
    });
    const html = generateReportHtml(reportWithFixes);
    expect(html).toContain('applied');
  });

  it('renders enforcement countdown', () => {
    const html = generateReportHtml(createMinimalReport());
    // Days until enforcement should appear
    expect(html).toContain('114');
    expect(html).toContain('2026-08-02');
  });

  it('renders document inventory with status badges', () => {
    const html = generateReportHtml(createMinimalReport());
    expect(html).toContain('fria');
    expect(html).toMatch(/scaffold|missing|draft|reviewed/i);
  });
});
