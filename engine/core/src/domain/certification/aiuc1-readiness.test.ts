import { describe, it, expect } from 'vitest';
import { computeReadiness } from './aiuc1-readiness.js';
import type { ReadinessInput } from './aiuc1-readiness.js';
import type { ScanResult } from '../../types/common.types.js';
import type { AgentPassport } from '../../types/passport.types.js';
import type { EvidenceChainSummary } from '../scanner/evidence-store.js';

const createMockPassport = (overrides: Partial<AgentPassport> = {}): AgentPassport => ({
  id: 'test-id',
  version: '1.0.0',
  name: 'test-agent',
  type: 'assistant',
  provider: { name: 'Test Corp', contact: 'test@test.com' },
  model: { id: 'test-model', provider: 'test' },
  description: 'Test AI system',
  capabilities: ['chat', 'analysis'],
  limitations: ['no real-time data'],
  autonomy_level: 'L2',
  autonomy_evidence: {
    human_approval_gates: 3,
    unsupervised_actions: 1,
    no_logging_actions: 0,
    auto_rated: false,
  },
  permissions: {
    tools: ['read', 'write'],
    denied: [],
    data_boundaries: ['internal-only'],
  },
  constraints: {
    rate_limits: { max_requests_per_minute: 60 },
    budget: { max_cost_per_session: 10 },
    prohibited_actions: ['delete-production'],
    human_approval_required: ['deploy'],
  },
  compliance: {
    eu_ai_act: {
      risk_class: 'high',
      applicable_articles: ['Art.9', 'Art.11', 'Art.13'],
    },
    fria_completed: true,
    fria_date: '2026-03-01',
    worker_notification_sent: true,
    worker_notification_date: '2026-03-01',
  },
  created: '2026-03-01T00:00:00Z',
  updated: '2026-03-01T00:00:00Z',
  signature: { algorithm: 'ed25519', publicKey: 'test', value: 'test' },
  ...overrides,
} as unknown as AgentPassport);

const createMockScanResult = (overrides: Partial<ScanResult> = {}): ScanResult => ({
  score: { totalScore: 72, breakdown: {} },
  findings: [
    { checkId: 'l1-architecture', type: 'pass', message: 'Architecture docs found', severity: 'info' },
    { checkId: 'l2-docs', type: 'pass', message: 'Docs have depth', severity: 'info' },
    { checkId: 'banned-packages', type: 'pass', message: 'No banned packages', severity: 'info' },
    { checkId: 'l2-data-governance', type: 'pass', message: 'Data governance found', severity: 'info' },
    { checkId: 'sdk-disclosure', type: 'pass', message: 'Disclosure configured', severity: 'info' },
    { checkId: 'interaction-logging', type: 'pass', message: 'Logging configured', severity: 'info' },
    { checkId: 'drift-detection', type: 'pass', message: 'Drift detection active', severity: 'info' },
    { checkId: 'cybersecurity-check', type: 'pass', message: 'Security measures present', severity: 'info' },
    { checkId: 'testing-infrastructure', type: 'pass', message: 'Tests found', severity: 'info' },
    { checkId: 'kill-switch', type: 'pass', message: 'Kill switch present', severity: 'info' },
  ],
  projectPath: '/test',
  scannedAt: '2026-03-01T00:00:00Z',
  duration: 100,
  filesScanned: 50,
  ...overrides,
} as unknown as ScanResult);

const createMockEvidenceSummary = (overrides: Partial<EvidenceChainSummary> = {}): EvidenceChainSummary => ({
  totalEntries: 10,
  scanCount: 5,
  firstEntry: '2026-01-01T00:00:00Z',
  lastEntry: '2026-03-01T00:00:00Z',
  chainValid: true,
  uniqueFindings: 20,
  ...overrides,
});

const createFullInput = (): ReadinessInput => ({
  passport: createMockPassport(),
  scanResult: createMockScanResult(),
  documents: new Set(['fria', 'policy', 'worker-notification']),
  evidenceSummary: createMockEvidenceSummary(),
});

describe('computeReadiness', () => {
  it('returns 100% for fully compliant system', () => {
    const result = computeReadiness(createFullInput());
    expect(result.overallScore).toBe(100);
    expect(result.readinessLevel).toBe('certified');
    expect(result.metRequirements).toBe(15);
    expect(result.partialRequirements).toBe(0);
    expect(result.unmetRequirements).toBe(0);
    expect(result.gaps).toHaveLength(0);
  });

  it('returns frozen result', () => {
    const result = computeReadiness(createFullInput());
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('returns "early" for empty inputs', () => {
    const result = computeReadiness({
      passport: createMockPassport({
        description: '',
        capabilities: [],
        limitations: [],
        autonomy_level: undefined,
        autonomy_evidence: undefined,
        permissions: { tools: [], denied: [] },
        constraints: {},
        compliance: {},
      } as unknown as Partial<AgentPassport>),
      scanResult: null,
      documents: new Set(),
      evidenceSummary: createMockEvidenceSummary({ totalEntries: 0, scanCount: 0 }),
    });

    expect(result.readinessLevel).toBe('early');
    expect(result.overallScore).toBeLessThan(40);
    expect(result.unmetRequirements).toBeGreaterThan(0);
    expect(result.gaps.length).toBeGreaterThan(0);
  });

  it('marks requirements as partial when some checks pass', () => {
    const input = createFullInput();
    // Remove FRIA document to make DOC-03 partial (passport field still set)
    const docs = new Set(['policy', 'worker-notification']);
    const result = computeReadiness({ ...input, documents: docs });

    const doc03 = result.requirements.find((r) => r.id === 'DOC-03');
    expect(doc03?.status).toBe('partial');
    expect(result.partialRequirements).toBeGreaterThan(0);
  });

  it('computes category scores correctly', () => {
    const result = computeReadiness(createFullInput());

    for (const cat of result.categories) {
      expect(cat.score).toBe(100);
      expect(cat.achievedWeight).toBeCloseTo(cat.maxWeight, 4);
    }
  });

  it('handles missing scan result', () => {
    const result = computeReadiness({
      ...createFullInput(),
      scanResult: null,
    });

    // All scan_check requirements should fail
    const scanReqs = result.requirements.filter(
      (r) => r.checks.some((c) => !c.passed && c.detail?.includes('No scan result')),
    );
    expect(scanReqs.length).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThan(100);
  });

  it('detects banned packages as failed check', () => {
    const scanResult = createMockScanResult({
      findings: [
        ...createMockScanResult().findings.filter((f) => f.checkId !== 'banned-packages'),
        { checkId: 'banned-packages', type: 'fail', message: 'Banned package found: subliminal', severity: 'critical' },
      ],
    } as Partial<ScanResult>);

    const result = computeReadiness({ ...createFullInput(), scanResult });

    const risk02 = result.requirements.find((r) => r.id === 'RISK-02');
    const bannedCheck = risk02?.checks.find((c) => c.description.includes('banned'));
    expect(bannedCheck?.passed).toBe(false);
  });

  it('requires multiple scans for monitoring', () => {
    const result = computeReadiness({
      ...createFullInput(),
      evidenceSummary: createMockEvidenceSummary({ scanCount: 1 }),
    });

    const mon02 = result.requirements.find((r) => r.id === 'MON-02');
    const scanCountCheck = mon02?.checks.find((c) => c.description.includes('Multiple scans'));
    expect(scanCountCheck?.passed).toBe(false);
  });

  it('readiness level thresholds are correct', () => {
    // near_ready: 70-89
    const nearReady = computeReadiness({
      ...createFullInput(),
      scanResult: null, // reduces score
      documents: new Set(),
    });
    // Score will be between 40-89 depending on passport fields
    expect(['near_ready', 'in_progress']).toContain(nearReady.readinessLevel);
  });

  it('produces correct total requirements count', () => {
    const result = computeReadiness(createFullInput());
    expect(result.totalRequirements).toBe(15);
    expect(result.metRequirements + result.partialRequirements + result.unmetRequirements).toBe(15);
  });

  it('gaps include article references', () => {
    const result = computeReadiness({
      ...createFullInput(),
      documents: new Set(), // no documents
    });

    // DOC-03, DATA-01, TRANS-02 should show gaps for missing documents
    const friaGap = result.gaps.find((g) => g.includes('DOC-03'));
    expect(friaGap).toContain('Art.27');
  });

  it('resolves nested passport fields with dot notation', () => {
    const passport = createMockPassport({
      compliance: {
        eu_ai_act: {
          risk_class: 'high',
          applicable_articles: ['Art.9'],
        },
      },
    } as unknown as Partial<AgentPassport>);

    const result = computeReadiness({
      ...createFullInput(),
      passport,
    });

    const risk03 = result.requirements.find((r) => r.id === 'RISK-03');
    const riskClassCheck = risk03?.checks.find((c) => c.description.includes('Risk class assigned'));
    expect(riskClassCheck?.passed).toBe(true);
  });
});
