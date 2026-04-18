/**
 * RED test specs for ISO 42001 Risk Register Generator.
 * Architect writes these BEFORE implementation exists.
 * nodejs-dev implements risk-register-generator.ts to make these GREEN.
 */
import { describe, it, expect } from 'vitest';
import type { AgentPassport } from '../../types/passport.types.js';
import type { ScanResult, Finding, RiskRegisterEntry, RiskRegisterResult } from '../../types/common.types.js';

// Import will fail until nodejs-dev creates the file:
import { generateRiskRegister } from './risk-register-generator.js';

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

const makeFinding = (
  checkId: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  opts?: { fix?: string; file?: string },
): Finding => ({
  checkId,
  type: 'fail',
  message: `${checkId} finding — ${severity} issue`,
  severity,
  fix: opts?.fix,
  file: opts?.file,
});

const createMockScanResult = (findings: readonly Finding[]): ScanResult => ({
  score: {
    totalScore: 55,
    zone: 'yellow',
    categoryScores: [],
    criticalCapApplied: false,
    totalChecks: 40,
    passedChecks: 22,
    failedChecks: findings.length,
    skippedChecks: 0,
  },
  findings,
  projectPath: '/test/project',
  scannedAt: '2026-04-12T00:00:00Z',
  duration: 1000,
  filesScanned: 30,
});

// --- Tests ---

describe('generateRiskRegister', () => {
  it('returns RiskRegisterResult with correct structure', () => {
    const scanResult = createMockScanResult([
      makeFinding('l3-banned-package', 'critical'),
      makeFinding('l4-bare-llm', 'medium', { fix: 'Wrap with @complior/sdk' }),
    ]);

    const result: RiskRegisterResult = generateRiskRegister({
      manifest: createMockPassport(),
      scanResult,
    });

    expect(result.markdown).toContain('Risk Register');
    expect(result.entries).toHaveLength(2);
    expect(result.totalRisks).toBe(2);
    expect(typeof result.criticalCount).toBe('number');
    expect(typeof result.highCount).toBe('number');
    expect(typeof result.averageRiskScore).toBe('number');
  });

  it('generates riskId in RISK-YYYY-NNN format', () => {
    const scanResult = createMockScanResult([
      makeFinding('l3-banned-package', 'critical'),
    ]);

    const result = generateRiskRegister({
      manifest: createMockPassport(),
      scanResult,
    });

    expect(result.entries[0].riskId).toMatch(/^RISK-\d{4}-\d{3}$/);
  });

  it('maps critical severity to likely/severe', () => {
    const scanResult = createMockScanResult([
      makeFinding('l3-banned-package', 'critical'),
    ]);

    const result = generateRiskRegister({
      manifest: createMockPassport(),
      scanResult,
    });

    const entry = result.entries[0];
    expect(entry.severity).toBe('critical');
    expect(entry.likelihood).toBe('likely');
    expect(entry.impact).toBe('severe');
    expect(entry.riskScore).toBe(20); // 4 × 5
  });

  it('maps high severity to possible/major', () => {
    const scanResult = createMockScanResult([
      makeFinding('l4-no-human-oversight', 'high'),
    ]);

    const result = generateRiskRegister({
      manifest: createMockPassport(),
      scanResult,
    });

    const entry = result.entries[0];
    expect(entry.likelihood).toBe('possible');
    expect(entry.impact).toBe('major');
    expect(entry.riskScore).toBe(12); // 3 × 4
  });

  it('maps medium severity to unlikely/moderate', () => {
    const scanResult = createMockScanResult([
      makeFinding('l4-bare-llm', 'medium'),
    ]);

    const result = generateRiskRegister({
      manifest: createMockPassport(),
      scanResult,
    });

    const entry = result.entries[0];
    expect(entry.likelihood).toBe('unlikely');
    expect(entry.impact).toBe('moderate');
    expect(entry.riskScore).toBe(6); // 2 × 3
  });

  it('maps low severity to rare/minor', () => {
    const scanResult = createMockScanResult([
      makeFinding('l4-info-check', 'low'),
    ]);

    const result = generateRiskRegister({
      manifest: createMockPassport(),
      scanResult,
    });

    const entry = result.entries[0];
    expect(entry.likelihood).toBe('rare');
    expect(entry.impact).toBe('minor');
    expect(entry.riskScore).toBe(2); // 1 × 2
  });

  it('sets treatment to mitigate when fix exists', () => {
    const scanResult = createMockScanResult([
      makeFinding('l4-bare-llm', 'medium', { fix: 'Wrap with @complior/sdk' }),
    ]);

    const result = generateRiskRegister({
      manifest: createMockPassport(),
      scanResult,
    });

    expect(result.entries[0].treatment).toBe('mitigate');
    expect(result.entries[0].mitigation).toContain('complior/sdk');
  });

  it('sets treatment to accept when no fix available', () => {
    const scanResult = createMockScanResult([
      makeFinding('l4-no-human-oversight', 'high'), // no fix field
    ]);

    const result = generateRiskRegister({
      manifest: createMockPassport(),
      scanResult,
    });

    expect(result.entries[0].treatment).toBe('accept');
  });

  it('sorts entries by riskScore descending', () => {
    const scanResult = createMockScanResult([
      makeFinding('l4-bare-llm', 'low'),
      makeFinding('l3-banned-package', 'critical'),
      makeFinding('l4-no-logging', 'medium'),
    ]);

    const result = generateRiskRegister({
      manifest: createMockPassport(),
      scanResult,
    });

    expect(result.entries).toHaveLength(3);
    expect(result.entries[0].severity).toBe('critical');
    expect(result.entries[1].severity).toBe('medium');
    expect(result.entries[2].severity).toBe('low');
    expect(result.entries[0].riskScore).toBeGreaterThan(result.entries[1].riskScore);
    expect(result.entries[1].riskScore).toBeGreaterThan(result.entries[2].riskScore);
  });

  it('calculates summary statistics correctly', () => {
    const scanResult = createMockScanResult([
      makeFinding('l3-banned-package', 'critical'),
      makeFinding('l4-no-human-oversight', 'high'),
      makeFinding('l4-bare-llm', 'medium'),
      makeFinding('l4-info-check', 'low'),
    ]);

    const result = generateRiskRegister({
      manifest: createMockPassport(),
      scanResult,
    });

    expect(result.totalRisks).toBe(4);
    expect(result.criticalCount).toBe(1);
    expect(result.highCount).toBe(1);
    // Average: (20 + 12 + 6 + 2) / 4 = 10
    expect(result.averageRiskScore).toBe(10);
  });

  it('excludes pass findings from risk register', () => {
    const scanResult = createMockScanResult([
      { checkId: 'l1-fria', type: 'pass', message: 'FRIA exists', severity: 'info' },
      makeFinding('l4-bare-llm', 'medium'),
    ]);

    const result = generateRiskRegister({
      manifest: createMockPassport(),
      scanResult,
    });

    // Only fail findings become risk entries
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].source).toBe('l4-bare-llm');
  });

  it('renders markdown with risk table', () => {
    const scanResult = createMockScanResult([
      makeFinding('l3-banned-package', 'critical', { file: 'package.json' }),
    ]);

    const result = generateRiskRegister({
      manifest: createMockPassport(),
      scanResult,
    });

    expect(result.markdown).toContain('Test AI System');
    expect(result.markdown).toContain('l3-banned-package');
    expect(result.markdown).toContain('critical');
    expect(result.markdown).toContain('RISK-');
  });

  it('returns empty register when no fail findings', () => {
    const scanResult = createMockScanResult([
      { checkId: 'l1-fria', type: 'pass', message: 'FRIA exists', severity: 'info' },
    ]);

    const result = generateRiskRegister({
      manifest: createMockPassport(),
      scanResult,
    });

    expect(result.entries).toHaveLength(0);
    expect(result.totalRisks).toBe(0);
    expect(result.criticalCount).toBe(0);
    expect(result.averageRiskScore).toBe(0);
  });

  it('sets owner from passport.oversight.responsible_person', () => {
    const passport = createMockPassport({
      oversight: { responsible_person: 'Dr. Mueller', role: 'DPO', mechanism: 'audit' },
    });
    const scanResult = createMockScanResult([
      makeFinding('l4-bare-llm', 'medium'),
    ]);

    const result = generateRiskRegister({
      manifest: passport,
      scanResult,
    });

    expect(result.entries[0].owner).toBe('Dr. Mueller');
  });
});
