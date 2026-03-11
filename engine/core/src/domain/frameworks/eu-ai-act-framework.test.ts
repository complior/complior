import { describe, it, expect } from 'vitest';
import { createEuAiActFramework, scoreEuAiAct } from './eu-ai-act-framework.js';
import type { FoundationMetrics } from '../../types/framework.types.js';
import type { ScanResult, ScoreBreakdown } from '../../types/common.types.js';

const mockBreakdown = (score: number, categories: ScoreBreakdown['categoryScores'] = []): ScoreBreakdown => ({
  totalScore: score,
  zone: score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red',
  categoryScores: categories,
  criticalCapApplied: false,
  totalChecks: 20,
  passedChecks: Math.round(score / 5),
  failedChecks: 20 - Math.round(score / 5),
  skippedChecks: 0,
});

const mockScanResult = (score: number): ScanResult => ({
  score: mockBreakdown(score),
  findings: [],
  projectPath: '/test',
  scannedAt: new Date().toISOString(),
  duration: 100,
  filesScanned: 10,
});

const emptyMetrics: FoundationMetrics = {
  scanResult: null,
  passport: null,
  passportCompleteness: 0,
  evidenceChainValid: false,
  evidenceEntryCount: 0,
  evidenceScanCount: 0,
  documents: new Set(),
};

describe('EU AI Act Framework', () => {
  it('creates framework with id eu-ai-act', () => {
    const fw = createEuAiActFramework(undefined);
    expect(fw.id).toBe('eu-ai-act');
    expect(fw.name).toBe('EU AI Act');
    expect(fw.deadline).toBe('2026-08-02');
    expect(fw.gradeMapping.type).toBe('letter');
  });

  it('creates framework with scoring data categories', () => {
    const scoringData = {
      regulation_id: 'eu-ai-act',
      total_obligations: 10,
      critical_obligations: 2,
      critical_obligation_ids: ['obl-1'],
      critical_obligations_note: '',
      weighted_categories: [
        { category: 'transparency', weight: 0.3, weight_reasoning: '', obligations_in_category: ['t1', 't2'] },
        { category: 'documentation', weight: 0.7, weight_reasoning: '', obligations_in_category: ['d1'] },
      ],
      score_formula: '',
      score_interpretation: {},
      thresholds: { red: { range: '', label: '' }, yellow: { range: '', label: '' }, green: { range: '', label: '' } },
      minimum_for_certificate: 90,
      certificate_additional_requirements: [],
      domain_specific_categories: [],
    };
    const fw = createEuAiActFramework(scoringData);
    expect(fw.categories).toHaveLength(2);
    expect(fw.checks).toHaveLength(3); // t1, t2, d1
  });

  it('returns F grade with no scan result', () => {
    const fw = createEuAiActFramework(undefined);
    const result = scoreEuAiAct(fw, emptyMetrics);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
    expect(result.gradeType).toBe('letter');
  });

  it('maps scan score to grade A', () => {
    const fw = createEuAiActFramework(undefined);
    const metrics = { ...emptyMetrics, scanResult: mockScanResult(95) };
    const result = scoreEuAiAct(fw, metrics);
    expect(result.score).toBe(95);
    expect(result.grade).toBe('A');
  });

  it('maps scan score to grade B', () => {
    const fw = createEuAiActFramework(undefined);
    const metrics = { ...emptyMetrics, scanResult: mockScanResult(80) };
    const result = scoreEuAiAct(fw, metrics);
    expect(result.grade).toBe('B');
  });

  it('maps scan score to grade C', () => {
    const fw = createEuAiActFramework(undefined);
    const metrics = { ...emptyMetrics, scanResult: mockScanResult(65) };
    const result = scoreEuAiAct(fw, metrics);
    expect(result.grade).toBe('C');
  });

  it('maps scan score to grade D', () => {
    const fw = createEuAiActFramework(undefined);
    const metrics = { ...emptyMetrics, scanResult: mockScanResult(45) };
    const result = scoreEuAiAct(fw, metrics);
    expect(result.grade).toBe('D');
  });

  it('maps category scores from scan breakdown', () => {
    const fw = createEuAiActFramework(undefined);
    const scan = mockScanResult(80);
    (scan.score as { categoryScores: ScoreBreakdown['categoryScores'] }).categoryScores = [
      { category: 'transparency', weight: 0.3, score: 90, obligationCount: 5, passedCount: 4 },
    ];
    const metrics = { ...emptyMetrics, scanResult: scan };
    const result = scoreEuAiAct(fw, metrics);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].categoryName).toBe('transparency');
    expect(result.categories[0].score).toBe(90);
  });
});
