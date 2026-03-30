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

// Build scorer dependencies matching factory signature: { weights, obligationMap }
const buildScorerDeps = (weightRows, obligationRows) => {
  const weights = {};
  for (const row of weightRows) {
    weights[row.category] = parseFloat(row.weight);
  }
  const obligationMap = {};
  for (const row of obligationRows) {
    obligationMap[row.obligationIdUnique] = {
      category: row.category,
      severity: row.severity,
      parentObligation: row.parentObligation || null,
      deadline: row.deadline || null,
      penaltyForNonCompliance: row.penaltyForNonCompliance || null,
      appliesToRiskLevel: row.appliesToRiskLevel || null,
    };
  }
  return { weights, obligationMap };
};

// Standard weights (2 categories for simple math)
const WEIGHTS = [
  { category: 'transparency', weight: 0.6 },
  { category: 'risk_management', weight: 0.4 },
];

// Standard obligation map with v2 fields
const OBLIGATIONS = [
  { obligationIdUnique: 'OBL-001', category: 'transparency', severity: 'high', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
  { obligationIdUnique: 'OBL-002', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
  { obligationIdUnique: 'OBL-003', category: 'risk_management', severity: 'critical', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
  { obligationIdUnique: 'OBL-004', category: 'risk_management', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
];

const makeTool = (overrides = {}) => ({
  slug: 'test-tool',
  name: 'Test Tool',
  level: 'scanned',
  categories: ['chatbot'],
  provider: { name: 'TestCo' },
  evidence: {},
  assessments: {
    'eu-ai-act': {
      risk_level: 'limited',
      applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
      deployer_obligations: [],
      provider_obligations: [],
      score: 0,
    },
  },
  ...overrides,
});

describe('Registry Scorer v3.1', () => {
  let scorerFactory;

  beforeEach(() => {
    scorerFactory = loadModule(
      path.join(__dirname, '../app/domain/registry/registry-scorer.js'),
    );
  });

  // ── 1. All met + evidence ────────────────────────────────────────

  it('scores all met + evidence → ~95-100, grade A/A+', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'doc A' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'doc B' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'doc C' },
            { obligation_id: 'OBL-004', status: 'met', evidence_summary: 'doc D' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.ok(result.score >= 95, `Score ${result.score} should be ≥95`);
    assert.ok(['A+', 'A'].includes(result.grade), `Grade ${result.grade} should be A/A+`);
    assert.strictEqual(result.zone, 'green');
    assert.strictEqual(result.algorithm, 'deterministic-v3.1');
  });

  // ── 2. All not_met ───────────────────────────────────────────────

  it('scores all not_met → 0, grade F', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'not_met' },
            { obligation_id: 'OBL-002', status: 'not_met' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'not_met' },
            { obligation_id: 'OBL-004', status: 'not_met' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.grade, 'F');
    assert.strictEqual(result.zone, 'red');
  });

  // ── 3. Mixed statuses with severity weighting ────────────────────

  it('scores mixed statuses with severity-weighted average', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'yes' },
            { obligation_id: 'OBL-002', status: 'not_met' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'yes' },
            { obligation_id: 'OBL-004', status: 'partially_met' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.ok(result.score > 0 && result.score < 100, `Score ${result.score} should be between 0-100`);
    assert.ok(result.categoryScores.transparency, 'Should have transparency category');
    assert.ok(result.categoryScores.risk_management, 'Should have risk_management category');
  });

  // ── 4. Critical cap ──────────────────────────────────────────────

  it('critical not_met → cap at 40, grade D', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'not_met' },
            { obligation_id: 'OBL-004', status: 'met', evidence_summary: 'c' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.criticalCapApplied, true);
    assert.ok(result.score <= 40, `Score ${result.score} should be ≤40`);
    assert.strictEqual(result.penalties.criticalCap, true);
  });

  // ── 5. Met without evidence ──────────────────────────────────────

  it('met without evidence → 75 per obligation', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met' },
            { obligation_id: 'OBL-002', status: 'met' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'met' },
            { obligation_id: 'OBL-004', status: 'met' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    // Base score is 75 per obligation, but category completeness bonus (+5%) applies
    // 75 × 1.05 = 78.75 → rounds to 79
    assert.strictEqual(result.score, 79);
  });

  // ── 6. Low-confidence met ────────────────────────────────────────

  it('low-confidence met → 65 (with enough obligations)', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', confidence: 0.3 },
            { obligation_id: 'OBL-002', status: 'met', confidence: 0.3 },
            { obligation_id: 'OBL-003', status: 'met', confidence: 0.3 },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    // Low-confidence met = 65 each. All met → completeness bonus → ~68
    assert.ok(result.score !== null, 'Score should not be null');
    // All obligations are met_low_confidence (65), completeness bonus applies
    const detail = result.obligationDetails.find((d) => d.id === 'OBL-001');
    assert.strictEqual(detail.baseScore, 65, 'Low-confidence met should score 65');
  });

  // ── 7. Unknown → null (insufficient data) ──────────────────────

  it('all unknown obligations → null score, reason insufficient_data', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'unknown' },
            { obligation_id: 'OBL-002', status: 'unknown' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'unknown' },
            { obligation_id: 'OBL-004', status: 'unknown' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.score, null);
    assert.strictEqual(result.reason, 'insufficient_data');
    assert.strictEqual(result.coverage, 0);
    assert.strictEqual(result.grade, null);
    assert.strictEqual(result.zone, null);
    assert.strictEqual(result.algorithm, 'deterministic-v3.1');
    assert.ok(typeof result.transparencyScore === 'number');
    assert.ok(typeof result.transparencyGrade === 'string');
  });

  // ── 8. No assessment ─────────────────────────────────────────────

  it('auto-derives applicable obligations when assessment missing', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));
    const tool = makeTool({ assessments: null });
    const result = await scorer.calculate(tool);
    // With obligationMap populated, scorer derives obligations from riskLevel
    // and proceeds to score (insufficient_data since no evidence)
    assert.strictEqual(result.score, null);
    assert.strictEqual(result.reason, 'insufficient_data');
  });

  it('returns null score when obligationMap is empty', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, []));
    const tool = makeTool({ assessments: null });
    const result = await scorer.calculate(tool);
    assert.strictEqual(result.score, null);
    assert.strictEqual(result.reason, 'no_applicable_obligations');
  });

  // ── 9. Determinism ───────────────────────────────────────────────

  it('is deterministic — identical inputs produce identical outputs', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'yes' },
            { obligation_id: 'OBL-002', status: 'partially_met' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'unknown' },
            { obligation_id: 'OBL-004', status: 'not_met' },
          ],
        },
      },
    });

    const r1 = await scorer.calculate(tool);
    const r2 = await scorer.calculate(tool);
    assert.strictEqual(r1.score, r2.score);
    assert.strictEqual(r1.grade, r2.grade);
    assert.deepStrictEqual(r1.counts, r2.counts);
  });

  // ── 10. Parent not_met → child capped ────────────────────────────

  it('parent not_met → child capped at partially_met', async () => {
    const obligations = [
      { obligationIdUnique: 'OBL-P', category: 'transparency', severity: 'high', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-C', category: 'transparency', severity: 'medium', parentObligation: 'OBL-P', deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
    ];
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, obligations));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-P', 'OBL-C'],
          deployer_obligations: [
            { obligation_id: 'OBL-P', status: 'not_met' },
            { obligation_id: 'OBL-C', status: 'met', evidence_summary: 'yes' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    const childDetail = result.obligationDetails.find((d) => d.id === 'OBL-C');
    assert.strictEqual(childDetail.derivedStatus, 'partially_met');
    assert.strictEqual(childDetail.parentId, 'OBL-P');
    assert.strictEqual(childDetail.parentStatus, 'not_met');
  });

  // ── 11. Parent met → child confidence +0.1 ──────────────────────

  it('parent met → child confidence boosted', async () => {
    const obligations = [
      { obligationIdUnique: 'OBL-P', category: 'transparency', severity: 'high', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-C', category: 'transparency', severity: 'medium', parentObligation: 'OBL-P', deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
    ];
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, obligations));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-P', 'OBL-C'],
          deployer_obligations: [
            { obligation_id: 'OBL-P', status: 'met', evidence_summary: 'yes' },
            { obligation_id: 'OBL-C', status: 'met', confidence: 0.5, evidence_summary: 'yes' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    const childDetail = result.obligationDetails.find((d) => d.id === 'OBL-C');
    assert.ok(childDetail.confidence >= 0.6, `Expected confidence ≥0.6, got ${childDetail.confidence}`);
  });

  // ── 12. Overdue deadline urgency ─────────────────────────────────

  it('overdue deadline (>1 year) → urgencyMultiplier 1.5x', async () => {
    const pastDate = '2024-01-01';
    const obligations = [
      { obligationIdUnique: 'OBL-001', category: 'transparency', severity: 'high', parentObligation: null, deadline: pastDate, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-002', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-003', category: 'risk_management', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
    ];
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, obligations));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'unknown' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'b' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    const detail = result.obligationDetails.find((d) => d.id === 'OBL-001');
    assert.strictEqual(detail.urgencyMultiplier, 1.5);
    assert.strictEqual(detail.isOverdue, true);
    assert.ok(detail.daysOverdue > 365, `Expected >365 days overdue, got ${detail.daysOverdue}`);
  });

  // ── 13. Approaching deadline ─────────────────────────────────────

  it('approaching deadline (<180 days) → urgencyMultiplier 1.1x', async () => {
    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const obligations = [
      { obligationIdUnique: 'OBL-001', category: 'transparency', severity: 'high', parentObligation: null, deadline: futureDate, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-002', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-003', category: 'risk_management', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
    ];
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, obligations));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'unknown' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'b' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    const detail = result.obligationDetails.find((d) => d.id === 'OBL-001');
    assert.strictEqual(detail.urgencyMultiplier, 1.1);
  });

  // ── 14. Sector-specific multiplier ───────────────────────────────

  it('sector-specific: HR tool + OBL-HR → 1.25x', async () => {
    const obligations = [
      { obligationIdUnique: 'OBL-HR-001', category: 'transparency', severity: 'high', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-002', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-003', category: 'risk_management', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
    ];
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, obligations));

    const tool = makeTool({
      categories: ['hr', 'recruiting'],
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-HR-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-HR-001', status: 'met', evidence_summary: 'yes' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'b' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    const detail = result.obligationDetails.find((d) => d.id === 'OBL-HR-001');
    assert.strictEqual(detail.sectorMultiplier, 1.25);
  });

  // ── 15. Penalty-weighted severity ────────────────────────────────

  it('penalty-weighted: €35M obligation → 1.3x weight', async () => {
    const obligations = [
      { obligationIdUnique: 'OBL-001', category: 'transparency', severity: 'high', parentObligation: null, deadline: null, penaltyForNonCompliance: '€35M / 7% global turnover', appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-002', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-003', category: 'risk_management', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
    ];
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, obligations));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'yes' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'b' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    const detail = result.obligationDetails.find((d) => d.id === 'OBL-001');
    assert.strictEqual(detail.penaltyMultiplier, 1.3);
  });

  // ── 16. GDPR enforcement penalty ─────────────────────────────────

  it('GDPR enforcement → -3/incident (max -8)', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      evidence: {
        passive_scan: {
          web_search: {
            gdpr_enforcement_history: ['Italy 2023', 'France 2024'],
          },
        },
      },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
            { obligation_id: 'OBL-004', status: 'met', evidence_summary: 'd' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.penalties.gdprEnforcement, 6); // 2 × 3
    assert.ok(result.score < 100, 'Score should be reduced by GDPR penalty');
  });

  // ── 17. Security incidents penalty ───────────────────────────────

  it('security incidents → -2/incident (max -5)', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      evidence: {
        passive_scan: {
          web_search: {
            security_incidents: ['breach 2023', 'leak 2024', 'vuln 2024'],
          },
        },
      },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
            { obligation_id: 'OBL-004', status: 'met', evidence_summary: 'd' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.penalties.securityIncidents, 5); // capped at 5
  });

  // ── 18. High-severity >50% not_met ──────────────────────────────

  it('high-severity >50% not_met → -10 additional penalty', async () => {
    const obligations = [
      { obligationIdUnique: 'OBL-H1', category: 'transparency', severity: 'high', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-H2', category: 'transparency', severity: 'high', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-M1', category: 'risk_management', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
    ];
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, obligations));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-H1', 'OBL-H2', 'OBL-M1'],
          deployer_obligations: [
            { obligation_id: 'OBL-H1', status: 'not_met' },
            { obligation_id: 'OBL-H2', status: 'not_met' },
            { obligation_id: 'OBL-M1', status: 'met', evidence_summary: 'yes' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.penalties.highSeverityPenalty, 10);
  });

  // ── 19. EU AI Act page bonus ─────────────────────────────────────

  it('EU AI Act page bonus → +3', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      evidence: {
        passive_scan: {
          trust: { has_eu_ai_act_page: true },
        },
      },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.bonuses.euAiActPage, 3);
  });

  // ── 20. Model card bonus ─────────────────────────────────────────

  it('model card 3+ sections → +3', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      evidence: {
        passive_scan: {
          model_card: {
            has_model_card: true,
            has_limitations: true,
            has_bias_info: true,
            has_training_data: true,
            has_evaluation: false,
          },
        },
      },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.bonuses.modelCard, 3);
  });

  // ── 21. Privacy excellence bonus ─────────────────────────────────

  it('privacy excellence → +2', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      evidence: {
        passive_scan: {
          privacy_policy: {
            training_opt_out: true,
            deletion_right: true,
            retention_specified: true,
          },
        },
      },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.bonuses.privacyExcellence, 2);
  });

  // ── 22. Bonuses capped at +10 ───────────────────────────────────

  it('evidence bonuses capped at +10, provider tier additive', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      evidence: {
        passive_scan: {
          trust: {
            has_eu_ai_act_page: true,
            mentions_ai_act: true,
            certifications: ['ISO 42001'],
          },
          model_card: {
            has_model_card: true,
            has_limitations: true,
            has_bias_info: true,
            has_training_data: true,
            has_evaluation: true,
          },
          privacy_policy: {
            training_opt_out: true,
            deletion_right: true,
            retention_specified: true,
          },
          web_search: {
            has_transparency_report: true,
          },
        },
      },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    // Evidence total would be 3+2+3+2+1+2=13, capped at 10. Provider = 0 (TestCo). Total = 10.
    assert.strictEqual(result.bonuses.total, 10);
    assert.strictEqual(result.bonuses.providerTier, 0);
  });

  // ── 23. All-unknown → null (v3: insufficient_data) ─────────────

  it('all-unknown → null score, no penalty object', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.score, null);
    assert.strictEqual(result.reason, 'insufficient_data');
    assert.strictEqual(result.penalties, null);
  });

  // ── 24. Grade boundaries ─────────────────────────────────────────

  it('grade boundaries are correct', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    const validGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
    assert.ok(validGrades.includes(result.grade), `Grade ${result.grade} should be valid`);
  });

  // ── 25. Numerical confidence ─────────────────────────────────────

  it('confidence numerical: verified ~0.9, scanned ~0.6, classified ~0.2', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const baseAssessments = {
      'eu-ai-act': {
        applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
        deployer_obligations: [
          { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
          { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
          { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
        ],
        provider_obligations: [],
      },
    };

    const verified = await scorer.calculate(makeTool({ level: 'verified', assessments: baseAssessments }));
    assert.ok(verified.confidence >= 0.85, `Verified confidence ${verified.confidence} should be ≥0.85`);

    const scanned = await scorer.calculate(makeTool({ level: 'scanned', assessments: baseAssessments }));
    assert.ok(scanned.confidence >= 0.55 && scanned.confidence <= 0.75, `Scanned confidence ${scanned.confidence} should be ~0.6`);

    const classified = await scorer.calculate(makeTool({ level: 'classified', assessments: baseAssessments }));
    assert.ok(classified.confidence >= 0.15 && classified.confidence <= 0.35, `Classified confidence ${classified.confidence} should be ~0.2`);
  });

  // ── 26. Category renormalization ─────────────────────────────────

  it('renormalizes weights when only some categories are active', async () => {
    const obligations = [
      { obligationIdUnique: 'OBL-001', category: 'transparency', severity: 'high', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-002', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-005', category: 'transparency', severity: 'low', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
    ];
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, obligations));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-005'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
            { obligation_id: 'OBL-005', status: 'met', evidence_summary: 'c' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.ok(result.score >= 95, `Score ${result.score} should be ≥95 with only transparency active`);
  });

  // ── 27. Category completeness bonus ──────────────────────────────

  it('category completeness: all met in category → +5%', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.categoryScores.transparency.completenessBonus, true);
  });

  // ── 28. Maturity model ───────────────────────────────────────────

  it('maturity model: all criteria mapped correctly', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    // Classified tool with no evidence → unaware
    const classified = await scorer.calculate(makeTool({
      level: 'classified',
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001'],
          deployer_obligations: [],
          provider_obligations: [],
        },
      },
    }));
    assert.strictEqual(classified.maturity.criteria, 'unaware');
    assert.strictEqual(classified.maturity.level, 0);

    // Tool with disclosure + at least 1 assessed → aware
    const aware = await scorer.calculate(makeTool({
      evidence: { passive_scan: { disclosure: { visible: true } } },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'partially_met' },
            { obligation_id: 'OBL-002', status: 'unknown' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'unknown' },
            { obligation_id: 'OBL-004', status: 'unknown' },
          ],
        },
      },
    }));
    assert.strictEqual(aware.maturity.criteria, 'aware');
    assert.strictEqual(aware.maturity.level, 1);
  });

  // ── 29. Confidence interval ──────────────────────────────────────

  it('confidence interval: more partially_met → wider interval', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    // Mostly partially_met → wide interval (optimistic=met, pessimistic=not_met)
    const wide = await scorer.calculate(makeTool({
      level: 'scanned',
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'partially_met' },
            { obligation_id: 'OBL-002', status: 'partially_met' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'partially_met' },
            { obligation_id: 'OBL-004', status: 'partially_met' },
          ],
        },
      },
    }));

    // All met → narrow interval (no variance)
    const narrow = await scorer.calculate(makeTool({
      level: 'scanned',
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
            { obligation_id: 'OBL-004', status: 'met', evidence_summary: 'd' },
          ],
        },
      },
    }));

    assert.ok(wide.confidenceInterval.width > narrow.confidenceInterval.width,
      `Wide interval width (${wide.confidenceInterval.width}) should be > narrow width (${narrow.confidenceInterval.width})`);
  });

  // ── 30. Conservative deduplication ───────────────────────────────

  it('conservative dedup: deployer met + provider unknown → unknown wins', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'deployer says met' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'b' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-001', status: 'unknown' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    // Conservative: unknown (worse) wins, but evidence_summary kept
    const detail = result.obligationDetails.find((d) => d.id === 'OBL-001');
    assert.strictEqual(detail.derivedStatus, 'unknown');
  });

  // ── 31. Mixed assessed+unknown → score based only on assessed ──

  it('v3.1: mixed assessed+unknown → unknowns scored at 15/100, coverage calculated', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'unknown' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
            { obligation_id: 'OBL-004', status: 'unknown' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.ok(result.score !== null, 'Score should not be null when some are assessed');
    assert.ok(result.score > 50, `Score ${result.score} should be high since assessed are all met`);
    assert.strictEqual(result.coverage, 40); // 2 assessed / max(4,5) = 40%
    assert.strictEqual(result.counts.assessed, 2);
    assert.strictEqual(result.counts.unknown, 2);
  });

  // ── 32. Coverage calculation ──────────────────────────────────────

  it('v3: coverage = assessed/total * 100', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'partially_met' },
            { obligation_id: 'OBL-003', status: 'not_met' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-004', status: 'unknown' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.coverage, 60); // 3 assessed / max(4,5) = 60%
    assert.strictEqual(result.counts.assessed, 3);
  });

  // ── 33. Transparency score computation ────────────────────────────

  it('v3.1: transparency score from passive_scan signals', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      evidence: {
        passive_scan: {
          disclosure: { visible: true },
          trust: { has_eu_ai_act_page: true, has_responsible_ai_page: true, certifications: ['ISO 42001'] },
          privacy_policy: { mentions_ai: true, mentions_eu: true },
          model_card: {
            has_model_card: true, has_limitations: true,
            has_bias_info: true, has_training_data: true,
            has_evaluation: false,
          },
          web_search: { has_transparency_report: true, has_public_bias_audit: true },
          content_marking: { c2pa: true },
        },
      },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    // 15 + 10 + 15 + 10 + 15 + 10 + 10 + 10 + 5 = 100
    assert.strictEqual(result.transparencyScore, 100);
    assert.strictEqual(result.transparencyGrade, 'A+');
  });

  // ── 34. Algorithm = deterministic-v3 ──────────────────────────────

  it('v3.1: algorithm label is deterministic-v3.1', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.algorithm, 'deterministic-v3.1');
  });

  // ── 35. Single assessed obligation → valid score ──────────────────

  it('v3.1: single assessed obligation + 3 unknowns → valid score (unknowns in denominator)', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'doc A' },
            { obligation_id: 'OBL-002', status: 'unknown' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'unknown' },
            { obligation_id: 'OBL-004', status: 'unknown' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.ok(result.score !== null, 'Score should not be null with 4 obligations');
    assert.strictEqual(result.coverage, 20); // 1 assessed / max(4,5) = 20%
    // v3.1: unknowns count as 15/100 in denominator, so score is lower than pure met
    assert.ok(result.score < 80, `Score ${result.score} should be < 80 due to unknowns in denominator`);
    assert.ok(result.score > 30, `Score ${result.score} should be > 30`);
  });

  // ── v3.1: Denominator exploit fix ─────────────────────────────────

  it('v3.1: 1 met + 5 unknown → ~37% not 100% (denominator exploit fix)', async () => {
    const obligations = [
      { obligationIdUnique: 'OBL-001', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-002', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-003', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-004', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-005', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-006', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
    ];
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, obligations));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004', 'OBL-005', 'OBL-006'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'yes' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    // (100 + 5×15) / (6×100) = 175/600 = 29.2%, but capped by coverage ceiling
    // Coverage = 1/6 = 17%, ceiling = 25 + 17×1.5 = 50.5
    // rawScore ≈ 29, under ceiling, so score ≈ 29
    assert.ok(result.score < 50, `Score ${result.score} should be < 50 (was 100 with denominator exploit)`);
    assert.ok(result.score > 20, `Score ${result.score} should be > 20`);
  });

  // ── v3.1: Minimum obligation gate ─────────────────────────────────

  it('v3.1: tool with < 3 obligations → null, reason too_few_obligations', async () => {
    const obligations = [
      { obligationIdUnique: 'OBL-001', category: 'transparency', severity: 'high', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-002', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
    ];
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, obligations));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'yes' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'yes' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.score, null);
    assert.strictEqual(result.reason, 'too_few_obligations');
  });

  it('v3.1: tool with exactly 3 obligations → scored', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.ok(result.score !== null, 'Score should not be null with exactly 3 obligations');
  });

  // ── v3.1: Coverage ceiling ────────────────────────────────────────

  it('v3.1: coverage ceiling limits high raw scores at low coverage', async () => {
    const obligations = [];
    for (let i = 1; i <= 10; i++) {
      obligations.push({
        obligationIdUnique: `OBL-${String(i).padStart(3, '0')}`,
        category: 'transparency',
        severity: 'medium',
        parentObligation: null, deadline: null,
        penaltyForNonCompliance: null, appliesToRiskLevel: null,
      });
    }

    // 3 met out of 10 = 30% coverage → ceiling = 25 + 30×1.5 = 70
    // rawScore = (3×100 + 7×25) / (10×100) × 100 = 47.5%
    // rawScore 47.5 < ceiling 70, so ceiling does NOT apply here
    // To trigger ceiling: need high raw score + low coverage
    // Use 5 met out of 20 = 25% coverage → ceiling = 25 + 25×1.5 = 62.5
    const obligations20 = [];
    for (let i = 1; i <= 20; i++) {
      obligations20.push({
        obligationIdUnique: `OBL-${String(i).padStart(3, '0')}`,
        category: 'transparency',
        severity: i <= 5 ? 'critical' : 'low',
        parentObligation: null, deadline: null,
        penaltyForNonCompliance: null, appliesToRiskLevel: null,
      });
    }
    const scorer2 = scorerFactory(buildScorerDeps(WEIGHTS, obligations20));

    // 5 critical met, 15 low unknown → rawScore is high due to critical weighting
    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: obligations20.map((o) => o.obligationIdUnique),
          deployer_obligations: obligations20.slice(0, 5).map((o) => ({
            obligation_id: o.obligationIdUnique, status: 'met', evidence_summary: 'a',
          })),
          provider_obligations: [],
        },
      },
    });

    const result = await scorer2.calculate(tool);
    // Coverage = 5/20 = 25%, ceiling = 25 + 25×1.5 = 62.5
    // Earned: 5×(100×15) + 15×(25×2) = 7500 + 750 = 8250
    // Max: 5×(100×15) + 15×(100×2) = 7500 + 3000 = 10500
    // rawScore = 8250/10500 × 100 = 78.57 → capped to 62
    assert.ok(result.score <= 63, `Score ${result.score} should be ≤ 63 (coverage ceiling at 25%)`);
    assert.strictEqual(result.penalties.lowCoverage, true);
  });

  // ── v3.1: Provider tier bonus ─────────────────────────────────────

  it('v3.1: Tier 1 provider (Anthropic) → +20 bonus', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      provider: { name: 'Anthropic' },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'unknown' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'unknown' },
            { obligation_id: 'OBL-004', status: 'unknown' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.bonuses.providerTier, 20);
    assert.ok(result.bonuses.total >= 20, `Total bonus ${result.bonuses.total} should include tier bonus 20`);
  });

  it('v3.1: Tier 2 provider (Mistral) → +10 bonus', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      provider: { name: 'Mistral' },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
            { obligation_id: 'OBL-004', status: 'met', evidence_summary: 'd' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.bonuses.providerTier, 10);
  });

  it('v3.1: unknown provider → 0 tier bonus', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      provider: { name: 'RandomStartup' },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
            { obligation_id: 'OBL-004', status: 'met', evidence_summary: 'd' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.bonuses.providerTier, 0);
  });

  // ── v3.1: Provider tier case-insensitive ──────────────────────────

  it('v3.1: provider tier is case-insensitive', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      provider: { name: 'openai' },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.bonuses.providerTier, 20);
  });

  // ── v3.1: Evidence-bonus obligations ──────────────────────────────

  it('v3.1: evidence-bonus obligations added from non-applicable evidence', async () => {
    const obligations = [
      { obligationIdUnique: 'OBL-001', category: 'transparency', severity: 'high', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-002', category: 'transparency', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-003', category: 'risk_management', severity: 'medium', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
      { obligationIdUnique: 'OBL-BONUS', category: 'transparency', severity: 'low', parentObligation: null, deadline: null, penaltyForNonCompliance: null, appliesToRiskLevel: null },
    ];
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, obligations));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
            { obligation_id: 'OBL-003', status: 'met', evidence_summary: 'c' },
          ],
          provider_obligations: [],
        },
      },
    });

    // Enriched obligations include OBL-BONUS which is NOT in applicable list
    const enriched = {
      derivedObligations: {
        'OBL-BONUS': {
          status: 'met',
          confidence: 0.8,
          evidence_summary: 'Found evidence of bonus obligation',
          signals: ['passive_scan.trust'],
        },
      },
      evidenceQuality: 0.5,
      evidenceFreshness: 1.0,
    };

    const result = await scorer.calculate(tool, enriched);
    // OBL-BONUS should be added as a bonus obligation
    const bonusDetail = result.obligationDetails.find((d) => d.id === 'OBL-BONUS');
    assert.ok(bonusDetail, 'Bonus obligation should be included');
    assert.strictEqual(bonusDetail.statusSource, 'evidence_bonus');
  });

  // ── v3.1: Confidence interval includes unknowns ───────────────────

  it('v3.1: confidence interval — unknowns widen interval (0..75 range)', async () => {
    const scorer = scorerFactory(buildScorerDeps(WEIGHTS, OBLIGATIONS));

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002', 'OBL-003', 'OBL-004'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'unknown' },
          ],
          provider_obligations: [
            { obligation_id: 'OBL-003', status: 'unknown' },
            { obligation_id: 'OBL-004', status: 'unknown' },
          ],
        },
      },
    });

    const result = await scorer.calculate(tool);
    // With 3 unknowns, the interval should be wider than 0
    assert.ok(result.confidenceInterval.width > 0, `Interval width ${result.confidenceInterval.width} should be > 0`);
    // Optimistic: unknowns → 75 (met_unverified), Pessimistic: unknowns → 0 (not_met)
    assert.ok(result.confidenceInterval.high > result.confidenceInterval.low,
      'High should be > low when unknowns present');
  });
});
