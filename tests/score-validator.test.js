'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const loadModule = (filePath) => {
  const src = fs.readFileSync(filePath, 'utf8');
  return vm.runInThisContext(src, { filename: filePath });
};

const OBLIGATIONS = [
  { obligationIdUnique: 'OBL-001', category: 'transparency', severity: 'high', deadline: '2025-02-02', parentObligation: null },
  { obligationIdUnique: 'OBL-002', category: 'transparency', severity: 'critical', deadline: null, parentObligation: null },
  { obligationIdUnique: 'OBL-003', category: 'risk_management', severity: 'medium', deadline: null, parentObligation: null },
];

const createMockDb = () => ({
  query: async (sql) => {
    if (sql.includes('Obligation')) {
      return { rows: OBLIGATIONS };
    }
    return { rows: [] };
  },
});

const makeTool = (overrides = {}) => ({
  slug: 'test-tool',
  name: 'Test Tool',
  level: 'scanned',
  provider: { name: 'TestCo' },
  riskLevel: 'limited',
  _score: 50,
  _scoring: {},
  assessments: {
    'eu-ai-act': {
      risk_level: 'limited',
      deployer_obligations: [],
      provider_obligations: [],
    },
  },
  ...overrides,
});

describe('Score Validator v2', () => {
  let validatorFactory;

  beforeEach(() => {
    validatorFactory = loadModule(
      path.join(__dirname, '../app/domain/registry/score-validator.js'),
    );
  });

  // ── Original 4 checks ────────────────────────────────────────────

  it('1. detects family outlier (score far from median)', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({ name: 'A', provider: { name: 'Acme' }, _score: 80 }),
      makeTool({ name: 'B', provider: { name: 'Acme' }, _score: 85 }),
      makeTool({ name: 'C', provider: { name: 'Acme' }, _score: 82 }),
      makeTool({ name: 'D', provider: { name: 'Acme' }, _score: 20 }),
    ];

    const result = await validator.validate(tools);
    const familyAnomalies = result.anomalies.filter((a) => a.check === 'family_consistency');
    assert.ok(familyAnomalies.length >= 1, 'Should flag family outlier');
    assert.ok(familyAnomalies.some((a) => a.tool === 'D'));
  });

  it('2. detects risk-score sanity violation', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'HighRiskTool',
        _score: 60,
        assessments: {
          'eu-ai-act': {
            risk_level: 'high',
            deployer_obligations: [{ obligation_id: 'OBL-001', status: 'unknown' }],
            provider_obligations: [{ obligation_id: 'OBL-002', status: 'unknown' }],
          },
        },
      }),
    ];

    const result = await validator.validate(tools);
    const sanity = result.anomalies.filter((a) => a.check === 'risk_score_sanity');
    assert.ok(sanity.length >= 1);
  });

  it('3. detects evidence completeness issue', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'VerifiedNoEvidence',
        level: 'verified',
        _score: 90,
        assessments: {
          'eu-ai-act': {
            risk_level: 'limited',
            deployer_obligations: [
              { obligation_id: 'OBL-001', status: 'met', evidence_summary: null },
              { obligation_id: 'OBL-002', status: 'met', evidence_summary: null },
              { obligation_id: 'OBL-003', status: 'met', evidence_summary: null },
            ],
            provider_obligations: [],
          },
        },
      }),
    ];

    const result = await validator.validate(tools);
    const evidence = result.anomalies.filter((a) => a.check === 'evidence_completeness');
    assert.ok(evidence.length >= 1);
  });

  it('4. detects 2σ statistical outlier', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [];
    for (let i = 0; i < 6; i++) {
      tools.push(makeTool({
        name: `Normal-${i}`,
        _score: 50,
        level: 'scanned',
        riskLevel: 'limited',
        assessments: { 'eu-ai-act': { risk_level: 'limited', deployer_obligations: [], provider_obligations: [] } },
      }));
    }
    tools.push(makeTool({
      name: 'Outlier',
      _score: 100,
      level: 'scanned',
      riskLevel: 'limited',
      assessments: { 'eu-ai-act': { risk_level: 'limited', deployer_obligations: [], provider_obligations: [] } },
    }));

    const result = await validator.validate(tools);
    const stats = result.anomalies.filter((a) => a.check === 'statistical_outlier');
    assert.ok(stats.length >= 1);
    assert.ok(stats.some((a) => a.tool === 'Outlier'));
  });

  // ── New Check 5: Grade-Score Consistency ──────────────────────────

  it('5. grade-score mismatch → flagged', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'BadGrade',
        _score: 50,
        _scoring: { grade: 'B+' }, // B+ requires ≥80
      }),
    ];

    const result = await validator.validate(tools);
    const gradeAnomalies = result.anomalies.filter((a) => a.check === 'grade_score_consistency');
    assert.ok(gradeAnomalies.length >= 1, 'Should flag grade-score mismatch');
  });

  // ── New Check 6: Evidence-Override Audit ──────────────────────────

  it('6. evidence-override >50% → flagged', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'OverriddenTool',
        _score: 60,
        _scoring: {
          obligationDetails: [
            { id: 'OBL-001', statusSource: 'evidence_derived', originalStatus: 'unknown', derivedStatus: 'partially_met' },
            { id: 'OBL-002', statusSource: 'evidence_derived', originalStatus: 'unknown', derivedStatus: 'met' },
            { id: 'OBL-003', statusSource: 'original', originalStatus: 'met', derivedStatus: 'met' },
          ],
        },
      }),
    ];

    const result = await validator.validate(tools);
    const override = result.anomalies.filter((a) => a.check === 'evidence_override_audit');
    assert.ok(override.length >= 1, 'Should flag >50% overrides');
  });

  // ── New Check 7: Deadline Urgency Audit ───────────────────────────

  it('7. overdue deadline + unknown status → flagged (error)', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'OverdueTool',
        _score: 30,
        _scoring: {
          obligationDetails: [
            { id: 'OBL-001', isOverdue: true, daysOverdue: 400, derivedStatus: 'unknown' },
            { id: 'OBL-002', isOverdue: true, daysOverdue: 300, derivedStatus: 'unknown' },
            { id: 'OBL-003', isOverdue: true, daysOverdue: 250, derivedStatus: 'unknown' },
            { id: 'OBL-004', isOverdue: true, daysOverdue: 200, derivedStatus: 'unknown' },
          ],
        },
      }),
    ];

    const result = await validator.validate(tools);
    const deadline = result.anomalies.filter((a) => a.check === 'deadline_urgency_audit');
    assert.ok(deadline.length >= 1, 'Should flag overdue unknown obligations');
    // With >3 overdue unknown, severity should be 'error'
    assert.ok(deadline.some((a) => a.severity === 'error'), 'Should be error severity');
  });

  // ── New Check 8: Confidence Floor/Ceiling ─────────────────────────

  it('8a. classified + high confidence → flagged', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'OverconfidentClassified',
        level: 'classified',
        _score: 30,
        _scoring: { confidence: 0.5 },
      }),
    ];

    const result = await validator.validate(tools);
    const conf = result.anomalies.filter((a) => a.check === 'confidence_floor_ceiling');
    assert.ok(conf.length >= 1, 'Should flag classified with high confidence');
  });

  it('8b. verified + low confidence → flagged', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'UnderconfidentVerified',
        level: 'verified',
        _score: 90,
        _scoring: { confidence: 0.4 },
      }),
    ];

    const result = await validator.validate(tools);
    const conf = result.anomalies.filter((a) => a.check === 'confidence_floor_ceiling');
    assert.ok(conf.length >= 1, 'Should flag verified with low confidence');
  });

  // ── New Check 9: Confidence Interval Width ────────────────────────

  it('9a. confidence interval width > 70 → warning', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'WideInterval',
        _score: 40,
        _scoring: { confidenceInterval: { low: 5, mid: 40, high: 80, width: 75 } },
      }),
    ];

    const result = await validator.validate(tools);
    const ci = result.anomalies.filter((a) => a.check === 'confidence_interval_width');
    assert.ok(ci.length >= 1, 'Should flag wide interval');
  });

  it('9b. classified + interval width < 10 → error', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'TooNarrow',
        level: 'classified',
        _score: 15,
        _scoring: { confidenceInterval: { low: 13, mid: 15, high: 18, width: 5 } },
      }),
    ];

    const result = await validator.validate(tools);
    const ci = result.anomalies.filter((a) => a.check === 'confidence_interval_width');
    assert.ok(ci.some((a) => a.severity === 'error'), 'Should be error for impossibly precise classified');
  });

  // ── New Check 10: Maturity-Score Coherence ────────────────────────

  it('10a. maturity exemplary + score < 85 → flagged', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'FakeExemplary',
        _score: 60,
        _scoring: { maturity: { criteria: 'exemplary', label: 'Exemplary', level: 4 } },
      }),
    ];

    const result = await validator.validate(tools);
    const mat = result.anomalies.filter((a) => a.check === 'maturity_score_coherence');
    assert.ok(mat.length >= 1, 'Should flag exemplary with low score');
  });

  it('10b. maturity compliant + criticalCap → flagged', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'CompliantWithCritical',
        _score: 35,
        _scoring: {
          maturity: { criteria: 'compliant', label: 'Compliant', level: 3 },
          criticalCapApplied: true,
        },
      }),
    ];

    const result = await validator.validate(tools);
    const mat = result.anomalies.filter((a) => a.check === 'maturity_score_coherence');
    assert.ok(mat.some((a) => a.severity === 'error'), 'Should be error for compliant + critical cap');
  });

  // ── Clean tool passes all checks ─────────────────────────────────

  it('clean tool passes all 10 checks', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'CleanTool',
        level: 'scanned',
        _score: 65,
        _scoring: {
          grade: 'C+',
          confidence: 0.6,
          maturity: { criteria: 'implementing', label: 'Implementing', level: 2 },
          confidenceInterval: { low: 40, mid: 65, high: 80, width: 40 },
          criticalCapApplied: false,
          evidenceQuality: 0.5,
          obligationDetails: [
            { id: 'OBL-001', statusSource: 'original', originalStatus: 'met', derivedStatus: 'met', isOverdue: false, daysOverdue: null },
          ],
        },
      }),
    ];

    const result = await validator.validate(tools);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  // ── Multiple anomalies ───────────────────────────────────────────

  it('multiple anomalies → all reported', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'MultiIssue',
        level: 'classified',
        _score: 60,
        _scoring: {
          grade: 'A+', // wrong
          confidence: 0.8, // too high for classified
          maturity: { criteria: 'exemplary', label: 'Exemplary', level: 4 }, // wrong
          confidenceInterval: { low: 58, mid: 60, high: 62, width: 4 }, // too narrow
          obligationDetails: [],
        },
      }),
    ];

    const result = await validator.validate(tools);
    const checks = new Set(result.anomalies.map((a) => a.check));
    assert.ok(checks.size >= 3, `Expected ≥3 different checks, got ${checks.size}: ${[...checks].join(', ')}`);
  });

  // ── Edge: zero penalties + zero bonuses ───────────────────────────

  it('edge: zero penalties + zero bonuses', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({ name: 'Neutral', _score: 50, _scoring: {} }),
    ];

    const result = await validator.validate(tools);
    // Should not crash, might or might not have anomalies
    assert.ok(result.anomalies !== undefined);
  });

  // ── Maturity unaware + score > 20 ────────────────────────────────

  it('maturity unaware + score > 20 → flagged', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'UnawareHighScore',
        _score: 35,
        _scoring: { maturity: { criteria: 'unaware', label: 'Unaware', level: 0 } },
      }),
    ];

    const result = await validator.validate(tools);
    const mat = result.anomalies.filter((a) => a.check === 'maturity_score_coherence');
    assert.ok(mat.length >= 1, 'Should flag unaware with score > 20');
  });

  // ── Handles empty cohort ─────────────────────────────────────────

  it('handles empty cohort without crash', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });
    const result = await validator.validate([]);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.anomalies.length, 0);
  });

  // ── New Check 11: Coverage-Score Coherence ───────────────────────

  it('11. high score + low coverage → flagged', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({
        name: 'HighScoreLowCoverage',
        _score: 85,
        _scoring: { coverage: 15 },
      }),
    ];

    const result = await validator.validate(tools);
    const coherence = result.anomalies.filter((a) => a.check === 'coverage_score_coherence');
    assert.ok(coherence.length >= 1, 'Should flag high score with low coverage');
    assert.ok(coherence.some((a) => a.severity === 'error'), 'Should be error severity for score>80 + coverage<20');
  });

  // ── Handles provider as JSON string ──────────────────────────────

  it('handles provider as JSON string', async () => {
    const db = createMockDb();
    const validator = validatorFactory({ db });

    const tools = [
      makeTool({ name: 'A', provider: '{"name": "StrCo"}', _score: 80 }),
      makeTool({ name: 'B', provider: '{"name": "StrCo"}', _score: 82 }),
      makeTool({ name: 'C', provider: '{"name": "StrCo"}', _score: 81 }),
      makeTool({ name: 'D', provider: '{"name": "StrCo"}', _score: 20 }),
    ];

    const result = await validator.validate(tools);
    const family = result.anomalies.filter((a) => a.check === 'family_consistency');
    assert.ok(family.length >= 1);
  });
});
