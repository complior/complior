/**
 * RED test specs for ISO 42001 Statement of Applicability Generator.
 * Architect writes these BEFORE implementation exists.
 * nodejs-dev implements soa-generator.ts to make these GREEN.
 */
import { describe, it, expect } from 'vitest';
import type { AgentPassport } from '../../types/passport.types.js';
import type { ScanResult, Finding, Iso42001Control, SoAEntry, SoAResult } from '../../types/common.types.js';

// Import will fail until nodejs-dev creates the file:
import { generateSoA } from './soa-generator.js';

// --- Fixtures ---

const createMockPassport = (overrides?: Partial<AgentPassport>): AgentPassport => ({
  schema_version: '1.0.0',
  passport_id: 'test-passport-001',
  display_name: 'Test AI System',
  description: 'A test AI assistant for customer support',
  version: '1.0.0',
  created_at: '2026-04-12T00:00:00Z',
  updated_at: '2026-04-12T00:00:00Z',
  status: 'active',
  owner: { team: 'AI Team', contact: 'ai@example.com' },
  model: { provider: 'OpenAI', model_id: 'gpt-4o', framework: 'OpenAI SDK' },
  autonomy_level: 'L2',
  compliance: {
    eu_ai_act: {
      risk_class: 'high',
      fria_completed: true,
      art5_screening: 'pass',
    },
  },
  oversight: {
    responsible_person: 'Jane Smith',
    role: 'AI Compliance Officer',
    mechanism: 'pre-decision review',
  },
  ...overrides,
} as AgentPassport);

const createMockScanResult = (findings: readonly Finding[]): ScanResult => ({
  score: {
    totalScore: 65,
    zone: 'yellow',
    categoryScores: [],
    criticalCapApplied: false,
    totalChecks: 50,
    passedChecks: 35,
    failedChecks: 10,
    skippedChecks: 5,
  },
  findings,
  projectPath: '/test/project',
  scannedAt: '2026-04-12T00:00:00Z',
  duration: 1200,
  filesScanned: 42,
});

const makePassFinding = (checkId: string): Finding => ({
  checkId,
  type: 'pass',
  message: `Check ${checkId} passed`,
  severity: 'info',
});

const makeFailFinding = (checkId: string): Finding => ({
  checkId,
  type: 'fail',
  message: `Check ${checkId} failed`,
  severity: 'medium',
});

const SAMPLE_CONTROLS: readonly Iso42001Control[] = [
  {
    controlId: 'A.2.2',
    group: 'AI Policies',
    title: 'AI Policy',
    description: 'Establish an AI policy',
    euAiActArticles: ['Art. 4', 'Art. 17'],
    checkIds: ['l1-ai-literacy', 'l1-qms'],
  },
  {
    controlId: 'A.5.2',
    group: 'Assessing AI System Impacts',
    title: 'AI risk assessment',
    description: 'Assess risks associated with AI systems',
    euAiActArticles: ['Art. 9'],
    checkIds: ['l1-risk-management', 'l1-fria'],
  },
  {
    controlId: 'A.6.2.10',
    group: 'AI System Lifecycle',
    title: 'Responsible AI use',
    description: 'Ensure AI systems are not used for prohibited practices',
    euAiActArticles: ['Art. 5'],
    checkIds: ['l1-art5-screening', 'l3-banned-package', 'l4-prohibited-patterns'],
  },
  {
    controlId: 'A.8.3',
    group: 'Information for Interested Parties',
    title: 'Communication about AI interaction',
    description: 'Inform users when interacting with AI',
    euAiActArticles: ['Art. 50', 'Art. 52'],
    checkIds: ['l4-disclosure', 'l4-content-marking'],
  },
];

// --- Tests ---

describe('generateSoA', () => {
  it('returns SoAResult with correct structure', () => {
    const passport = createMockPassport();
    const scanResult = createMockScanResult([
      makePassFinding('l1-ai-literacy'),
      makePassFinding('l1-qms'),
    ]);

    const result: SoAResult = generateSoA({
      manifest: passport,
      scanResult,
      controls: SAMPLE_CONTROLS,
    });

    expect(result.markdown).toContain('Statement of Applicability');
    expect(result.entries).toHaveLength(4);
    expect(result.completeness).toBeGreaterThanOrEqual(0);
    expect(result.completeness).toBeLessThanOrEqual(100);
    expect(result.applicableCount).toBeGreaterThan(0);
    expect(typeof result.implementedCount).toBe('number');
  });

  it('marks control as implemented when all checkIds have pass findings', () => {
    const passport = createMockPassport();
    const scanResult = createMockScanResult([
      makePassFinding('l1-ai-literacy'),
      makePassFinding('l1-qms'),
    ]);

    const result = generateSoA({
      manifest: passport,
      scanResult,
      controls: SAMPLE_CONTROLS,
    });

    const aiPolicy = result.entries.find(e => e.controlId === 'A.2.2')!;
    expect(aiPolicy.status).toBe('implemented');
    expect(aiPolicy.evidence).toContain('l1-ai-literacy');
    expect(aiPolicy.evidence).toContain('l1-qms');
    expect(aiPolicy.gaps).toHaveLength(0);
  });

  it('marks control as planned when some checkIds have findings', () => {
    const passport = createMockPassport();
    const scanResult = createMockScanResult([
      makePassFinding('l1-risk-management'),
      // l1-fria is missing
    ]);

    const result = generateSoA({
      manifest: passport,
      scanResult,
      controls: SAMPLE_CONTROLS,
    });

    const riskAssessment = result.entries.find(e => e.controlId === 'A.5.2')!;
    expect(riskAssessment.status).toBe('planned');
    expect(riskAssessment.evidence).toContain('l1-risk-management');
    expect(riskAssessment.gaps).toContain('l1-fria');
  });

  it('marks control as not-started when no checkIds have findings', () => {
    const passport = createMockPassport();
    const scanResult = createMockScanResult([]); // empty findings

    const result = generateSoA({
      manifest: passport,
      scanResult,
      controls: SAMPLE_CONTROLS,
    });

    const entry = result.entries.find(e => e.controlId === 'A.2.2')!;
    expect(entry.status).toBe('not-started');
    expect(entry.evidence).toHaveLength(0);
    expect(entry.gaps).toContain('l1-ai-literacy');
    expect(entry.gaps).toContain('l1-qms');
  });

  it('calculates completeness as implemented / applicable × 100', () => {
    const passport = createMockPassport();
    // 2 of 4 controls fully implemented
    const scanResult = createMockScanResult([
      makePassFinding('l1-ai-literacy'),
      makePassFinding('l1-qms'),
      makePassFinding('l1-art5-screening'),
      makePassFinding('l3-banned-package'),
      makePassFinding('l4-prohibited-patterns'),
    ]);

    const result = generateSoA({
      manifest: passport,
      scanResult,
      controls: SAMPLE_CONTROLS,
    });

    // A.2.2 = implemented (both checkIds present)
    // A.5.2 = not-started (no checkIds present)
    // A.6.2.10 = implemented (all 3 checkIds present)
    // A.8.3 = not-started (no checkIds present)
    // 2 implemented / 4 applicable = 50%
    expect(result.implementedCount).toBe(2);
    expect(result.applicableCount).toBe(4);
    expect(result.completeness).toBe(50);
  });

  it('renders markdown with table of controls', () => {
    const passport = createMockPassport();
    const scanResult = createMockScanResult([
      makePassFinding('l1-ai-literacy'),
    ]);

    const result = generateSoA({
      manifest: passport,
      scanResult,
      controls: SAMPLE_CONTROLS,
    });

    expect(result.markdown).toContain('A.2.2');
    expect(result.markdown).toContain('AI Policy');
    expect(result.markdown).toContain('Test AI System');
    // Should contain table rows for all controls
    expect(result.markdown).toContain('A.5.2');
    expect(result.markdown).toContain('A.6.2.10');
    expect(result.markdown).toContain('A.8.3');
  });

  it('includes summary statistics in markdown', () => {
    const passport = createMockPassport();
    const scanResult = createMockScanResult([]);

    const result = generateSoA({
      manifest: passport,
      scanResult,
      controls: SAMPLE_CONTROLS,
    });

    // Markdown should contain summary section
    expect(result.markdown).toContain('Completeness');
    expect(result.markdown).toMatch(/\d+%/);
  });

  it('prefills organization from passport.owner.team', () => {
    const passport = createMockPassport({ owner: { team: 'Acme Corp', contact: 'ai@acme.com' } });
    const scanResult = createMockScanResult([]);

    const result = generateSoA({
      manifest: passport,
      scanResult,
      controls: SAMPLE_CONTROLS,
    });

    expect(result.markdown).toContain('Acme Corp');
  });

  it('treats fail findings as evidence (finding exists → control is addressed)', () => {
    const passport = createMockPassport();
    // Fail findings still count as "the control is being addressed" (scanner found issues to fix)
    const scanResult = createMockScanResult([
      makeFailFinding('l1-ai-literacy'),
      makeFailFinding('l1-qms'),
    ]);

    const result = generateSoA({
      manifest: passport,
      scanResult,
      controls: SAMPLE_CONTROLS,
    });

    // Control A.2.2 has both checkIds scanned (even though they failed) → planned (not not-started)
    const aiPolicy = result.entries.find(e => e.controlId === 'A.2.2')!;
    expect(aiPolicy.status).toBe('planned');
    expect(aiPolicy.evidence).toContain('l1-ai-literacy');
  });
});
