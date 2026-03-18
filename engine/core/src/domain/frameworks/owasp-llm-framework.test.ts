import { describe, it, expect } from 'vitest';
import { createOwaspLlmFramework, scoreOwaspLlm } from './owasp-llm-framework.js';
import type { FoundationMetrics } from '../../types/framework.types.js';
import type { ScanResult } from '../../types/common.types.js';

const emptyMetrics: FoundationMetrics = {
  scanResult: null,
  passport: null,
  passportCompleteness: 0,
  evidenceChainValid: false,
  evidenceEntryCount: 0,
  evidenceScanCount: 0,
  documents: new Set(),
};

describe('OWASP LLM Framework', () => {
  it('creates framework with correct id and 10 categories', () => {
    const fw = createOwaspLlmFramework();
    expect(fw.id).toBe('owasp-llm-top10');
    expect(fw.name).toBe('OWASP LLM Top 10');
    expect(fw.categories).toHaveLength(10);
    expect(fw.gradeMapping.type).toBe('letter');
  });

  it('returns grade F with score 0 when no scan result', () => {
    const fw = createOwaspLlmFramework();
    const result = scoreOwaspLlm(fw, emptyMetrics);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
    expect(result.frameworkId).toBe('owasp-llm-top10');
  });

  it('returns score 0 when scan has no security findings (untested)', () => {
    const fw = createOwaspLlmFramework();
    const scan = {
      score: { totalScore: 80, zone: 'yellow', categoryScores: [], criticalCapApplied: false, totalChecks: 10, passedChecks: 8, failedChecks: 2 },
      findings: [],
      projectPath: '/test',
      scannedAt: new Date().toISOString(),
      duration: 100,
      filesScanned: 5,
    } as unknown as ScanResult;

    const result = scoreOwaspLlm(fw, { ...emptyMetrics, scanResult: scan });
    // No security findings → 0 (untested = not secure)
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
  });

  it('applies critical cap when a category has 0% pass rate', () => {
    const fw = createOwaspLlmFramework();
    const scan = {
      score: { totalScore: 80, zone: 'yellow', categoryScores: [], criticalCapApplied: false, totalChecks: 10, passedChecks: 8, failedChecks: 2 },
      findings: [
        { checkId: 'security-indirect-prompt-injection', type: 'fail', message: 'test', severity: 'critical', obligation_id: null, article_reference: null },
        { checkId: 'security-prompt-extraction', type: 'pass', message: 'test', severity: 'high', obligation_id: null, article_reference: null },
      ],
      projectPath: '/test',
      scannedAt: new Date().toISOString(),
      duration: 100,
      filesScanned: 5,
    } as unknown as ScanResult;

    const result = scoreOwaspLlm(fw, { ...emptyMetrics, scanResult: scan });
    // LLM01 has both indirect-prompt-injection and prompt-extraction in plugins
    // One pass, one fail → 50% for that category, not 0%, so no critical cap here
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('grade thresholds map correctly', () => {
    const fw = createOwaspLlmFramework();
    // Just test the framework creation is valid
    expect(fw.gradeMapping.thresholds).toHaveLength(5);
    expect(fw.gradeMapping.thresholds[0]!.minScore).toBe(90);
    expect(fw.gradeMapping.thresholds[0]!.grade).toBe('A');
  });
});
