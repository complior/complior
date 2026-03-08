import { describe, it, expect } from 'vitest';
import { computeAgentScore } from './compute-agent-score.js';
import type { AgentRegistryInput } from './compute-agent-score.js';
import { createMockPassport } from '../../test-helpers/factories.js';
import type { CompletenessResult } from '../passport/passport-validator.js';
import type { ScanResult } from '../../types/common.types.js';
import type { EvidenceChainSummary } from '../scanner/evidence-store.js';

// --- Helpers ---

const mockCompleteness = (score: number): CompletenessResult => ({
  score,
  filledCount: Math.round(score * 0.36),
  totalRequired: 36,
  filledFields: [],
  missingFields: [],
});

const mockScanResult = (totalScore: number, findings: ScanResult['findings'] = []): ScanResult => ({
  score: {
    totalScore,
    zone: totalScore >= 75 ? 'green' : totalScore >= 50 ? 'yellow' : 'red',
    categoryScores: [],
    criticalCapApplied: false,
    totalChecks: 10,
    passedChecks: Math.round(totalScore / 10),
    failedChecks: 10 - Math.round(totalScore / 10),
    skippedChecks: 0,
  },
  findings,
  projectPath: '/test/project',
  scannedAt: '2026-03-08T00:00:00Z',
  duration: 100,
  filesScanned: 20,
});

const mockEvidence = (entries: number, valid: boolean): EvidenceChainSummary => ({
  totalEntries: entries,
  scanCount: entries,
  firstEntry: entries > 0 ? '2026-01-01T00:00:00Z' : '',
  lastEntry: entries > 0 ? '2026-03-08T00:00:00Z' : '',
  chainValid: valid,
  uniqueFindings: entries * 2,
});

const passportWithFria = () =>
  createMockPassport({ compliance: { ...createMockPassport().compliance, fria_completed: true } });

const makeInput = (overrides: Partial<AgentRegistryInput> = {}): AgentRegistryInput => ({
  passport: createMockPassport(),
  completeness: mockCompleteness(100),
  scanResult: mockScanResult(85),
  evidenceSummary: mockEvidence(10, true),
  ...overrides,
});

// --- Tests ---

describe('computeAgentScore', () => {
  it('computes grade A for full score, FRIA done, evidence valid, completeness 100%', () => {
    const input = makeInput({
      passport: passportWithFria(),
      completeness: mockCompleteness(100),
      scanResult: mockScanResult(95),
      evidenceSummary: mockEvidence(10, true),
    });
    const result = computeAgentScore(input);
    // 95*0.4 + 100*0.3 + 15 + 15 = 38 + 30 + 15 + 15 = 98
    expect(result.grade).toBe('A');
    expect(result.complianceScore).toBe(95);
    expect(result.passportCompleteness).toBe(100);
    expect(result.friaStatus).toBe('completed');
    expect(result.evidenceChain.valid).toBe(true);
  });

  it('computes grade B with high completeness but no FRIA', () => {
    const input = makeInput({
      completeness: mockCompleteness(90),
      scanResult: mockScanResult(85),
      evidenceSummary: mockEvidence(5, true),
    });
    const result = computeAgentScore(input);
    // 85*0.4 + 90*0.3 + 0 + 15 = 34 + 27 + 0 + 15 = 76
    expect(result.grade).toBe('B');
    expect(result.friaStatus).toBe('pending');
  });

  it('computes grade C for medium scores', () => {
    const input = makeInput({
      completeness: mockCompleteness(70),
      scanResult: mockScanResult(70),
      evidenceSummary: mockEvidence(3, true),
    });
    const result = computeAgentScore(input);
    // 70*0.4 + 70*0.3 + 0 + 15 = 28 + 21 + 0 + 15 = 64
    expect(result.grade).toBe('C');
  });

  it('computes grade F for low completeness with no evidence', () => {
    const input = makeInput({
      completeness: mockCompleteness(40),
      scanResult: mockScanResult(50),
      evidenceSummary: mockEvidence(0, true),
    });
    const result = computeAgentScore(input);
    // 50*0.4 + 40*0.3 + 0 + 0 = 20 + 12 = 32
    expect(result.grade).toBe('F');
  });

  it('computes grade D at boundary', () => {
    const input = makeInput({
      passport: passportWithFria(),
      completeness: mockCompleteness(50),
      scanResult: mockScanResult(40),
      evidenceSummary: mockEvidence(0, true),
    });
    const result = computeAgentScore(input);
    // 40*0.4 + 50*0.3 + 15 + 0 = 16 + 15 + 15 + 0 = 46
    expect(result.grade).toBe('D');
  });

  it('computes grade F for zero scan, no passport fields', () => {
    const input = makeInput({
      completeness: mockCompleteness(10),
      scanResult: null,
      evidenceSummary: mockEvidence(0, true),
    });
    const result = computeAgentScore(input);
    // 0*0.4 + 10*0.3 + 0 + 0 = 3
    expect(result.grade).toBe('F');
    expect(result.complianceScore).toBe(0);
  });

  it('generates issue when FRIA is pending', () => {
    const result = computeAgentScore(makeInput());
    expect(result.issues).toContainEqual(expect.stringContaining('FRIA not completed'));
  });

  it('generates no FRIA issue when FRIA is completed', () => {
    const result = computeAgentScore(makeInput({ passport: passportWithFria() }));
    expect(result.issues.some((i) => i.includes('FRIA not completed'))).toBe(false);
  });

  it('generates issue for risk mismatch (high-risk industry but limited risk_class)', () => {
    const passport = createMockPassport({
      compliance: {
        ...createMockPassport().compliance,
        eu_ai_act: {
          ...createMockPassport().compliance.eu_ai_act,
          risk_class: 'limited',
        },
      },
    });
    const input = makeInput({
      passport,
      scanResult: mockScanResult(60, [
        { checkId: 'industry-hr', type: 'fail', message: 'HR match', severity: 'high' },
      ]),
    });
    const result = computeAgentScore(input);
    expect(result.issues).toContainEqual(
      expect.stringContaining("High-risk industry detected (hr) but risk_class is 'limited'"),
    );
  });

  it('does not generate risk mismatch issue when risk_class is high', () => {
    const input = makeInput({
      scanResult: mockScanResult(60, [
        { checkId: 'industry-hr', type: 'fail', message: 'HR match', severity: 'high' },
      ]),
    });
    // Default mock passport has risk_class 'high'
    const result = computeAgentScore(input);
    expect(result.issues.some((i) => i.includes('High-risk industry'))).toBe(false);
  });

  it('generates issue for broken evidence chain', () => {
    const input = makeInput({ evidenceSummary: mockEvidence(5, false) });
    const result = computeAgentScore(input);
    expect(result.issues).toContainEqual(expect.stringContaining('Evidence chain broken'));
  });

  it('generates issue for zero evidence entries', () => {
    const input = makeInput({ evidenceSummary: mockEvidence(0, true) });
    const result = computeAgentScore(input);
    expect(result.issues).toContainEqual(expect.stringContaining('No evidence chain entries'));
  });

  it('generates issue for low passport completeness', () => {
    const input = makeInput({ completeness: mockCompleteness(65) });
    const result = computeAgentScore(input);
    expect(result.issues).toContainEqual(expect.stringContaining('Passport only 65% complete'));
  });

  it('extracts industries from scan findings', () => {
    const input = makeInput({
      scanResult: mockScanResult(70, [
        { checkId: 'industry-hr', type: 'fail', message: 'HR match', severity: 'high' },
        { checkId: 'industry-finance', type: 'fail', message: 'Finance match', severity: 'high' },
        { checkId: 'l1-readme', type: 'pass', message: 'ok', severity: 'low' },
      ]),
    });
    const result = computeAgentScore(input);
    expect(result.detectedIndustries).toContain('hr');
    expect(result.detectedIndustries).toContain('finance');
    expect(result.detectedIndustries).not.toContain('l1-readme');
  });

  it('handles null scanResult — complianceScore = 0', () => {
    const result = computeAgentScore(makeInput({ scanResult: null }));
    expect(result.complianceScore).toBe(0);
    expect(result.detectedIndustries).toEqual([]);
  });

  it('handles empty evidenceSummary', () => {
    const input = makeInput({
      evidenceSummary: {
        totalEntries: 0,
        scanCount: 0,
        firstEntry: '',
        lastEntry: '',
        chainValid: true,
        uniqueFindings: 0,
      },
    });
    const result = computeAgentScore(input);
    expect(result.evidenceChain.entries).toBe(0);
    expect(result.evidenceChain.valid).toBe(true);
  });

  it('populates all identity fields from passport', () => {
    const passport = createMockPassport({
      name: 'my-bot',
      display_name: 'My Bot',
      agent_id: 'agent-42',
      framework: 'langchain',
      autonomy_level: 'L3',
    });
    const result = computeAgentScore(makeInput({ passport }));
    expect(result.name).toBe('my-bot');
    expect(result.displayName).toBe('My Bot');
    expect(result.agentId).toBe('agent-42');
    expect(result.framework).toBe('langchain');
    expect(result.autonomyLevel).toBe('L3');
  });

  it('deduplicates industry findings', () => {
    const input = makeInput({
      scanResult: mockScanResult(70, [
        { checkId: 'industry-hr', type: 'fail', message: 'HR match 1', severity: 'high', file: 'a.ts' },
        { checkId: 'industry-hr', type: 'fail', message: 'HR match 2', severity: 'high', file: 'b.ts' },
      ]),
    });
    const result = computeAgentScore(input);
    expect(result.detectedIndustries).toEqual(['hr']);
  });

  it('ignores pass-type industry findings (industry-detection)', () => {
    const input = makeInput({
      scanResult: mockScanResult(70, [
        { checkId: 'industry-detection', type: 'pass', message: 'No patterns detected', severity: 'low' },
      ]),
    });
    const result = computeAgentScore(input);
    expect(result.detectedIndustries).toEqual([]);
  });

  it('evidence bonus is 0 when chain is broken', () => {
    const input = makeInput({
      passport: passportWithFria(),
      completeness: mockCompleteness(100),
      scanResult: mockScanResult(100),
      evidenceSummary: mockEvidence(10, false),
    });
    const result = computeAgentScore(input);
    // 100*0.4 + 100*0.3 + 15 + 0 = 40 + 30 + 15 + 0 = 85
    expect(result.grade).toBe('B');
  });
});
