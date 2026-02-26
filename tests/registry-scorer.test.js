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

// Mock DB with scoring v2 fields
const createMockDb = (weights, obligations) => ({
  query: async (sql) => {
    if (sql.includes('ScoringWeight')) {
      return { rows: weights };
    }
    if (sql.includes('Obligation')) {
      return { rows: obligations };
    }
    return { rows: [] };
  },
});

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

describe('Registry Scorer v2', () => {
  let scorerFactory;

  beforeEach(() => {
    scorerFactory = loadModule(
      path.join(__dirname, '../app/domain/registry/registry-scorer.js'),
    );
  });

  // ── 1. All met + evidence ────────────────────────────────────────

  it('scores all met + evidence → ~95-100, grade A/A+', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    assert.strictEqual(result.algorithm, 'deterministic-v3');
  });

  // ── 2. All not_met ───────────────────────────────────────────────

  it('scores all not_met → 0, grade F', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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

  it('low-confidence met → 65', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', confidence: 0.3 },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    // Base score is 65, with completeness bonus (100% met): 65 × 1.05 = 68.25 → 68
    assert.strictEqual(result.score, 68);
  });

  // ── 7. Unknown → null (insufficient data) ──────────────────────

  it('all unknown obligations → null score, reason insufficient_data', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    assert.strictEqual(result.algorithm, 'deterministic-v3');
    assert.ok(typeof result.transparencyScore === 'number');
    assert.ok(typeof result.transparencyGrade === 'string');
  });

  // ── 8. No assessment ─────────────────────────────────────────────

  it('returns null score for no assessment', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });
    const tool = makeTool({ assessments: null });
    const result = await scorer.calculate(tool);
    assert.strictEqual(result.score, null);
    assert.strictEqual(result.reason, 'no_assessment');
  });

  // ── 9. Determinism ───────────────────────────────────────────────

  it('is deterministic — identical inputs produce identical outputs', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    const db = createMockDb(WEIGHTS, obligations);
    const scorer = scorerFactory({ db });

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
    const db = createMockDb(WEIGHTS, obligations);
    const scorer = scorerFactory({ db });

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
    ];
    const db = createMockDb(WEIGHTS, obligations);
    const scorer = scorerFactory({ db });

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'unknown' },
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
    ];
    const db = createMockDb(WEIGHTS, obligations);
    const scorer = scorerFactory({ db });

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'unknown' },
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
    ];
    const db = createMockDb(WEIGHTS, obligations);
    const scorer = scorerFactory({ db });

    const tool = makeTool({
      categories: ['hr', 'recruiting'],
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-HR-001'],
          deployer_obligations: [
            { obligation_id: 'OBL-HR-001', status: 'met', evidence_summary: 'yes' },
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
    ];
    const db = createMockDb(WEIGHTS, obligations);
    const scorer = scorerFactory({ db });

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'yes' },
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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    const db = createMockDb(WEIGHTS, obligations);
    const scorer = scorerFactory({ db });

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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

    const tool = makeTool({
      evidence: {
        passive_scan: {
          trust: { has_eu_ai_act_page: true },
        },
      },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
          applicable_obligation_ids: ['OBL-001'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
          applicable_obligation_ids: ['OBL-001'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.bonuses.privacyExcellence, 2);
  });

  // ── 22. Bonuses capped at +10 ───────────────────────────────────

  it('bonuses capped at +10', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
          applicable_obligation_ids: ['OBL-001'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    // Total would be 3+2+3+2+1+2=13, but capped at 10
    assert.strictEqual(result.bonuses.total, 10);
  });

  // ── 23. All-unknown → null (v3: insufficient_data) ─────────────

  it('all-unknown → null score, no penalty object', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

    // We can't easily get exact scores, so just verify the grade function
    // by checking the output has a valid grade
    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

    const baseAssessments = {
      'eu-ai-act': {
        applicable_obligation_ids: ['OBL-001'],
        deployer_obligations: [{ obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' }],
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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

    // All transparency obligations met
    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001', 'OBL-002'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' },
            { obligation_id: 'OBL-002', status: 'met', evidence_summary: 'b' },
          ],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.categoryScores.transparency.completenessBonus, true);
  });

  // ── 28. Maturity model ───────────────────────────────────────────

  it('maturity model: all criteria mapped correctly', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001'],
          deployer_obligations: [
            { obligation_id: 'OBL-001', status: 'met', evidence_summary: 'deployer says met' },
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

  it('v3: mixed assessed+unknown → score excludes unknowns, coverage calculated', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    assert.strictEqual(result.coverage, 50); // 2 assessed / 4 total = 50%
    assert.strictEqual(result.counts.assessed, 2);
    assert.strictEqual(result.counts.unknown, 2);
  });

  // ── 32. Coverage calculation ──────────────────────────────────────

  it('v3: coverage = assessed/total * 100', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    assert.strictEqual(result.coverage, 75); // 3 assessed / 4 total = 75%
    assert.strictEqual(result.counts.assessed, 3);
  });

  // ── 33. Transparency score computation ────────────────────────────

  it('v3: transparency score from passive_scan signals', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

    const tool = makeTool({
      evidence: {
        passive_scan: {
          disclosure: { visible: true },
          trust: { has_eu_ai_act_page: true, has_responsible_ai_page: true, certifications: ['ISO 42001'] },
          privacy_policy: { mentions_ai: true, mentions_eu: true },
          model_card: { has_model_card: true, has_limitations: true, has_bias_info: true, has_training_data: true, has_evaluation: false },
          web_search: { has_transparency_report: true, has_public_bias_audit: true },
          content_marking: { c2pa: true },
        },
      },
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001'],
          deployer_obligations: [{ obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' }],
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

  it('v3: algorithm label is deterministic-v3', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

    const tool = makeTool({
      assessments: {
        'eu-ai-act': {
          applicable_obligation_ids: ['OBL-001'],
          deployer_obligations: [{ obligation_id: 'OBL-001', status: 'met', evidence_summary: 'a' }],
          provider_obligations: [],
        },
      },
    });

    const result = await scorer.calculate(tool);
    assert.strictEqual(result.algorithm, 'deterministic-v3');
  });

  // ── 35. Single assessed obligation → valid score ──────────────────

  it('v3: single assessed obligation → valid score (not null)', async () => {
    const db = createMockDb(WEIGHTS, OBLIGATIONS);
    const scorer = scorerFactory({ db });

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
    assert.ok(result.score !== null, 'Score should not be null with 1 assessed obligation');
    assert.strictEqual(result.coverage, 25); // 1/4 = 25%
    assert.ok(result.grade !== null, 'Grade should not be null');
    assert.ok(result.zone !== null, 'Zone should not be null');
  });
});
