/**
 * Tests for evalToFindings — converts eval failures into scanner-compatible findings.
 *
 * Uses real playbooks (ALL_PLAYBOOKS) for realistic integration testing.
 */

import { describe, it, expect } from 'vitest';
import { evalToFindings } from './eval-to-findings.js';
import type { EvalResult, TestResult } from './types.js';
import { ALL_PLAYBOOKS } from '../../data/eval/remediation/index.js';

// ── Helpers ─────────────────────────────────────────────────────

const mockResult = (results: TestResult[]): EvalResult => ({
  target: 'http://localhost:4000',
  tier: 'full' as const,
  overallScore: 50,
  grade: 'D',
  categories: [],
  results,
  totalTests: results.length,
  passed: 0,
  failed: results.length,
  errors: 0,
  duration: 1000,
  timestamp: '2026-03-23T10:00:00Z',
  criticalCapped: false,
});

const makeFailure = (
  overrides: Partial<TestResult> & { category: TestResult['category'] },
): TestResult => ({
  testId: `test-${overrides.category}-001`,
  name: `${overrides.category} test`,
  method: 'deterministic',
  verdict: 'fail',
  score: 0,
  confidence: 100,
  reasoning: 'Failed compliance check',
  probe: 'Are you an AI?',
  response: 'I am a helpful assistant.',
  latencyMs: 120,
  timestamp: '2026-03-23T10:00:00Z',
  severity: 'high',
  ...overrides,
});

// ── Tests ───────────────────────────────────────────────────────

describe('evalToFindings', () => {
  // 1. Transparency failures → findings with type 'A' (system prompt)
  it('returns findings with type A for transparency failures', () => {
    const results: TestResult[] = [
      makeFailure({ category: 'transparency', testId: 'CT-1-001', severity: 'critical' }),
      makeFailure({ category: 'transparency', testId: 'CT-1-002', severity: 'high' }),
    ];

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe('A');
    expect(findings[0]!.checkId).toBe('eval-transparency');
    expect(findings[0]!.file).toBe('system-prompt');
    expect(findings[0]!.article).toBe('Art.50');
  });

  // 2. Prohibited failures → findings with type 'A'
  it('returns findings with type A for prohibited failures', () => {
    const results: TestResult[] = [
      makeFailure({ category: 'prohibited', testId: 'CT-7-001', severity: 'critical' }),
    ];

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe('A');
    expect(findings[0]!.checkId).toBe('eval-prohibited');
    expect(findings[0]!.file).toBe('system-prompt');
    expect(findings[0]!.article).toBe('Art.5');
  });

  // 3. Logging failures → findings with type 'B' (config file, top action is infrastructure)
  it('returns findings with type B for logging failures (infrastructure action)', () => {
    const results: TestResult[] = [
      makeFailure({ category: 'logging', testId: 'CT-8-001', severity: 'high' }),
      makeFailure({ category: 'logging', testId: 'CT-8-002', severity: 'medium' }),
    ];

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe('B');
    expect(findings[0]!.checkId).toBe('eval-logging');
    expect(findings[0]!.file).toBe('.complior/eval-fixes/logging-config.json');
    expect(findings[0]!.article).toBe('Art.12');
  });

  // 4. Security LLM03 (supply chain) failures → findings with type 'B'
  it('returns findings with type B for security LLM03 failures (infrastructure action)', () => {
    const results: TestResult[] = [
      makeFailure({
        category: 'robustness',
        owaspCategory: 'LLM03',
        testId: 'SEC-LLM03-001',
        severity: 'high',
      }),
    ];

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe('B');
    expect(findings[0]!.checkId).toBe('eval-LLM03');
    expect(findings[0]!.file).toBe('.complior/eval-fixes/LLM03-config.json');
  });

  // 5. Groups by category — 5 failures from same category → 1 finding
  it('groups by category: 5 failures from same category produce 1 finding', () => {
    const results: TestResult[] = Array.from({ length: 5 }, (_, i) =>
      makeFailure({
        category: 'transparency',
        testId: `CT-1-00${i + 1}`,
        severity: 'high',
      }),
    );

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.checkId).toBe('eval-transparency');
    expect(findings[0]!.title).toContain('5 eval failures');
  });

  // 6. No failures → returns empty array
  it('returns empty array when there are no failures', () => {
    const results: TestResult[] = [
      makeFailure({ category: 'transparency', testId: 'CT-1-001', verdict: 'pass', score: 100 }),
      makeFailure({ category: 'bias', testId: 'CT-4-001', verdict: 'pass', score: 100 }),
    ];

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    expect(findings).toEqual([]);
  });

  // 7. Each finding has required fields: checkId, title, type, severity, fixDescription
  it('each finding has checkId, title, type, severity, and fixDescription', () => {
    const results: TestResult[] = [
      makeFailure({ category: 'transparency', testId: 'CT-1-001', severity: 'critical' }),
      makeFailure({ category: 'logging', testId: 'CT-8-001', severity: 'high' }),
    ];

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    expect(findings.length).toBeGreaterThanOrEqual(2);

    for (const f of findings) {
      expect(f.checkId).toBeDefined();
      expect(f.checkId).toMatch(/^eval-/);
      expect(f.title).toBeDefined();
      expect(f.title.length).toBeGreaterThan(0);
      expect(f.type).toMatch(/^[AB]$/);
      expect(['critical', 'high', 'medium', 'low']).toContain(f.severity);
      expect(f.fixDescription).toBeDefined();
      expect(f.fixDescription.length).toBeGreaterThan(0);
    }
  });

  // 8. Mixed categories → correct number of findings (one per category)
  it('mixed categories produce one finding per category', () => {
    const results: TestResult[] = [
      // 2 transparency failures
      makeFailure({ category: 'transparency', testId: 'CT-1-001', severity: 'critical' }),
      makeFailure({ category: 'transparency', testId: 'CT-1-002', severity: 'high' }),
      // 1 bias failure
      makeFailure({ category: 'bias', testId: 'CT-4-001', severity: 'high' }),
      // 3 logging failures
      makeFailure({ category: 'logging', testId: 'CT-8-001', severity: 'medium' }),
      makeFailure({ category: 'logging', testId: 'CT-8-002', severity: 'medium' }),
      makeFailure({ category: 'logging', testId: 'CT-8-003', severity: 'low' }),
      // 1 prohibited failure
      makeFailure({ category: 'prohibited', testId: 'CT-7-001', severity: 'critical' }),
    ];

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    expect(findings).toHaveLength(4);

    const checkIds = findings.map((f) => f.checkId).sort();
    expect(checkIds).toEqual([
      'eval-bias',
      'eval-logging',
      'eval-prohibited',
      'eval-transparency',
    ]);
  });

  // ── Additional edge cases ─────────────────────────────────────

  it('uses owaspCategory over category when grouping security probe results', () => {
    const results: TestResult[] = [
      makeFailure({
        category: 'robustness',
        owaspCategory: 'LLM01',
        testId: 'SEC-LLM01-001',
        severity: 'critical',
      }),
      makeFailure({
        category: 'robustness',
        owaspCategory: 'LLM01',
        testId: 'SEC-LLM01-002',
        severity: 'high',
      }),
    ];

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.checkId).toBe('eval-LLM01');
    expect(findings[0]!.title).toContain('2 eval failures');
  });

  it('severity is elevated to critical when any failure in category is critical', () => {
    const results: TestResult[] = [
      makeFailure({ category: 'transparency', testId: 'CT-1-001', severity: 'low' }),
      makeFailure({ category: 'transparency', testId: 'CT-1-002', severity: 'critical' }),
      makeFailure({ category: 'transparency', testId: 'CT-1-003', severity: 'medium' }),
    ];

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('critical');
  });

  it('includes error-verdict results alongside fail-verdict results', () => {
    const results: TestResult[] = [
      makeFailure({ category: 'bias', testId: 'CT-4-001', verdict: 'fail', severity: 'high' }),
      makeFailure({ category: 'bias', testId: 'CT-4-002', verdict: 'error', severity: 'medium' }),
    ];

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.title).toContain('2 eval failures');
  });

  it('findings are sorted by severity (critical first, low last)', () => {
    const results: TestResult[] = [
      makeFailure({ category: 'logging', testId: 'CT-8-001', severity: 'low' }),
      makeFailure({ category: 'transparency', testId: 'CT-1-001', severity: 'critical' }),
      makeFailure({ category: 'bias', testId: 'CT-4-001', severity: 'medium' }),
    ];

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    const severities = findings.map((f) => f.severity);
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    for (let i = 1; i < severities.length; i++) {
      expect(severityOrder[severities[i]!]).toBeGreaterThanOrEqual(severityOrder[severities[i - 1]!]!);
    }
  });

  it('skips categories without a matching playbook', () => {
    const results: TestResult[] = [
      makeFailure({
        category: 'transparency',
        owaspCategory: 'UNKNOWN-CAT',
        testId: 'UNK-001',
        severity: 'high',
      }),
    ];

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    // owaspCategory takes precedence; 'UNKNOWN-CAT' has no playbook → skipped
    expect(findings).toEqual([]);
  });

  it('all finding layers are "eval"', () => {
    const results: TestResult[] = [
      makeFailure({ category: 'transparency', testId: 'CT-1-001', severity: 'high' }),
      makeFailure({ category: 'prohibited', testId: 'CT-7-001', severity: 'critical' }),
      makeFailure({ category: 'logging', testId: 'CT-8-001', severity: 'medium' }),
    ];

    const findings = evalToFindings(mockResult(results), ALL_PLAYBOOKS);

    for (const f of findings) {
      expect(f.layer).toBe('eval');
    }
  });
});
