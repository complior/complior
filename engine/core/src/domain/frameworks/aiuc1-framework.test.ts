import { describe, it, expect } from 'vitest';
import { createAiuc1Framework, scoreAiuc1 } from './aiuc1-framework.js';
import type { FoundationMetrics } from '../../types/framework.types.js';
import type { AgentPassport } from '../../types/passport.types.js';
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

const minimalPassport: AgentPassport = {
  agent_id: 'test-001',
  name: 'test-agent',
  version: '1.0.0',
  type: 'coding',
  description: 'A test agent',
  autonomy_level: 'L3',
  autonomy_evidence: 'test evidence',
  framework: 'custom',
  capabilities: ['code generation'],
  limitations: ['cannot deploy'],
  permissions: {
    tools: ['read', 'write'],
    denied: [],
    data_boundaries: ['internal only'],
    human_approval_required: [],
  },
  constraints: {
    rate_limits: {},
    budget: { max_cost_per_request: 1 },
    prohibited_actions: [],
  },
  compliance: {
    eu_ai_act: {
      risk_class: 'high',
      applicable_articles: ['Art.6', 'Art.9'],
      deployer_obligations_met: [],
      deployer_obligations_pending: [],
    },
    complior_score: 50,
    last_scan: new Date().toISOString(),
    fria_completed: false,
  },
  source: {
    detected_from: 'manual',
    config_files: [],
    created_at: new Date().toISOString(),
  },
  signature: undefined,
} as unknown as AgentPassport;

describe('AIUC-1 Framework', () => {
  it('creates framework with id aiuc-1', () => {
    const fw = createAiuc1Framework();
    expect(fw.id).toBe('aiuc-1');
    expect(fw.name).toBe('AIUC-1 Readiness');
    expect(fw.gradeMapping.type).toBe('level');
  });

  it('has 7 categories matching AIUC1_CATEGORIES', () => {
    const fw = createAiuc1Framework();
    expect(fw.categories).toHaveLength(7);
    const ids = fw.categories.map((c) => c.id);
    expect(ids).toContain('documentation');
    expect(ids).toContain('risk_management');
    expect(ids).toContain('transparency');
  });

  it('has checks derived from AIUC1_REQUIREMENTS', () => {
    const fw = createAiuc1Framework();
    expect(fw.checks.length).toBeGreaterThan(10);
  });

  it('returns Level 1 with no passport', () => {
    const fw = createAiuc1Framework();
    const result = scoreAiuc1(fw, emptyMetrics);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('Level 1');
    expect(result.gradeType).toBe('level');
  });

  it('computes readiness with passport', () => {
    const fw = createAiuc1Framework();
    const metrics: FoundationMetrics = {
      ...emptyMetrics,
      passport: minimalPassport,
      passportCompleteness: 60,
    };
    const result = scoreAiuc1(fw, metrics);
    expect(result.score).toBeGreaterThan(0);
    expect(result.frameworkId).toBe('aiuc-1');
  });

  it('returns higher score with scan result and documents', () => {
    const fw = createAiuc1Framework();
    const scanResult: ScanResult = {
      score: {
        totalScore: 70,
        zone: 'yellow',
        categoryScores: [],
        criticalCapApplied: false,
        totalChecks: 20,
        passedChecks: 14,
        failedChecks: 6,
        skippedChecks: 0,
      },
      findings: [
        { checkId: 'l1-architecture', type: 'pass', message: 'ok', severity: 'low' },
        { checkId: 'sdk-disclosure', type: 'pass', message: 'ok', severity: 'low' },
      ],
      projectPath: '/test',
      scannedAt: new Date().toISOString(),
      duration: 100,
      filesScanned: 10,
    };

    const baseMetrics: FoundationMetrics = {
      ...emptyMetrics,
      passport: minimalPassport,
    };
    const baseResult = scoreAiuc1(fw, baseMetrics);

    const richMetrics: FoundationMetrics = {
      ...emptyMetrics,
      passport: minimalPassport,
      scanResult,
      documents: new Set(['fria']),
      evidenceEntryCount: 5,
      evidenceScanCount: 3,
      evidenceChainValid: true,
    };
    const richResult = scoreAiuc1(fw, richMetrics);
    expect(richResult.score).toBeGreaterThanOrEqual(baseResult.score);
  });

  it('returns categories in result', () => {
    const fw = createAiuc1Framework();
    const metrics: FoundationMetrics = {
      ...emptyMetrics,
      passport: minimalPassport,
    };
    const result = scoreAiuc1(fw, metrics);
    expect(result.categories.length).toBeGreaterThan(0);
    expect(result.categories[0]).toHaveProperty('categoryId');
    expect(result.categories[0]).toHaveProperty('score');
  });

  it('maps to correct grade levels', () => {
    const fw = createAiuc1Framework();
    // Level 1 for no passport
    expect(scoreAiuc1(fw, emptyMetrics).grade).toBe('Level 1');
  });
});
