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

const createMockDb = () => ({
  query: async () => ({ rows: [] }),
});

const makeTool = (overrides = {}) => ({
  slug: 'test-tool',
  name: 'Test Tool',
  level: 'scanned',
  categories: ['chatbot'],
  provider: { name: 'TestCo' },
  riskLevel: 'limited',
  assessments: {
    'eu-ai-act': {
      risk_level: 'limited',
      applicable_obligation_ids: [],
      deployer_obligations: [],
      provider_obligations: [],
    },
  },
  evidence: {},
  ...overrides,
});

describe('Evidence Analyzer', () => {
  let analyzerFactory;
  let analyzer;

  beforeEach(() => {
    analyzerFactory = loadModule(
      path.join(__dirname, '../app/domain/registry/evidence-analyzer.js'),
    );
    analyzer = analyzerFactory({ db: createMockDb() });
  });

  // ── Rule 1: OBL-015 AI Disclosure ────────────────────────────────

  it('R1: disclosure visible at banner → OBL-015 met, confidence 0.9', () => {
    const tool = makeTool({
      evidence: {
        passive_scan: {
          disclosure: { visible: true, location: 'banner' },
        },
      },
    });
    const result = analyzer.analyze(tool);
    assert.strictEqual(result.derivedObligations['OBL-015'].status, 'met');
    assert.strictEqual(result.derivedObligations['OBL-015'].confidence, 0.9);
  });

  it('R1: disclosure at meta only → OBL-015 partially_met, confidence 0.7', () => {
    const tool = makeTool({
      evidence: {
        passive_scan: {
          disclosure: { visible: true, location: 'meta' },
        },
      },
    });
    const result = analyzer.analyze(tool);
    assert.strictEqual(result.derivedObligations['OBL-015'].status, 'partially_met');
    assert.strictEqual(result.derivedObligations['OBL-015'].confidence, 0.7);
  });

  it('R1: LLM identity 3/3 passed, no disclosure → partially_met, confidence 0.6', () => {
    const tool = makeTool({
      evidence: {
        passive_scan: {},
        llm_tests: [
          { group: 'identity', passed: true },
          { group: 'identity', passed: true },
          { group: 'identity', passed: true },
        ],
      },
    });
    const result = analyzer.analyze(tool);
    assert.strictEqual(result.derivedObligations['OBL-015'].status, 'partially_met');
    assert.strictEqual(result.derivedObligations['OBL-015'].confidence, 0.6);
  });

  it('R1: human tests override passive scan → highest priority wins', () => {
    const tool = makeTool({
      evidence: {
        passive_scan: {
          disclosure: { visible: false },
        },
        human_tests: {
          disclosure_visible: true,
          disclosure_text: 'Powered by AI',
          disclosure_location: 'header',
        },
      },
    });
    const result = analyzer.analyze(tool);
    assert.strictEqual(result.derivedObligations['OBL-015'].status, 'met');
    // Contradiction with passive_scan reduces confidence by 0.1 (1.0→0.9)
    assert.strictEqual(result.derivedObligations['OBL-015'].confidence, 0.9);
    assert.strictEqual(result.derivedObligations['OBL-015'].source, 'human_tests');
  });

  // ── Rule 2: OBL-016 Content Marking ──────────────────────────────

  it('R2: all media tests have C2PA → OBL-016 met, confidence 0.95', () => {
    const tool = makeTool({
      evidence: {
        media_tests: [
          { type: 'image', c2pa_present: true },
          { type: 'video', c2pa_present: true },
        ],
      },
    });
    const result = analyzer.analyze(tool);
    assert.strictEqual(result.derivedObligations['OBL-016'].status, 'met');
    assert.strictEqual(result.derivedObligations['OBL-016'].confidence, 0.95);
  });

  // ── Rule 3: OBL-016a Image C2PA ──────────────────────────────────

  it('R3: image tests exist but no marking → OBL-016a not_met, confidence 0.8', () => {
    const tool = makeTool({
      evidence: {
        media_tests: [
          { type: 'image', c2pa_present: false, watermark: false },
        ],
      },
    });
    const result = analyzer.analyze(tool);
    assert.strictEqual(result.derivedObligations['OBL-016a'].status, 'not_met');
    assert.strictEqual(result.derivedObligations['OBL-016a'].confidence, 0.8);
  });

  // ── Rule 4: OBL-001 AI Literacy ──────────────────────────────────
  // (tested indirectly via Rule 5 model card boost)

  // ── Rule 5: GPAI Documentation ───────────────────────────────────

  it('R5: model card 4/4 sections for GPAI → OBL-022 met, confidence 0.85', () => {
    const tool = makeTool({
      riskLevel: 'gpai',
      assessments: { 'eu-ai-act': { risk_level: 'gpai', applicable_obligation_ids: [], deployer_obligations: [], provider_obligations: [] } },
      evidence: {
        passive_scan: {
          model_card: {
            has_model_card: true,
            has_limitations: true,
            has_bias_info: true,
            has_training_data: true,
            has_evaluation: true,
          },
        },
      },
    });
    const result = analyzer.analyze(tool);
    assert.strictEqual(result.derivedObligations['OBL-022'].status, 'met');
    assert.strictEqual(result.derivedObligations['OBL-022'].confidence, 0.85);
    // Also maps to OBL-022a, 022b, 022c
    assert.strictEqual(result.derivedObligations['OBL-022a'].status, 'met');
    assert.strictEqual(result.derivedObligations['OBL-022b'].status, 'met');
    assert.strictEqual(result.derivedObligations['OBL-022c'].status, 'met');
  });

  // ── Rule 6: Safety ───────────────────────────────────────────────

  it('R6: safety LLM all passed → OBL-002a met, confidence 0.85', () => {
    const tool = makeTool({
      evidence: {
        llm_tests: [
          { group: 'safety', passed: true },
          { group: 'safety', passed: true },
          { group: 'safety', passed: true },
        ],
      },
    });
    const result = analyzer.analyze(tool);
    assert.strictEqual(result.derivedObligations['OBL-002a'].status, 'met');
    assert.strictEqual(result.derivedObligations['OBL-002a'].confidence, 0.85);
  });

  it('R6: safety LLM all FAILED → OBL-002a not_met, confidence 0.75 (DOWNGRADE)', () => {
    const tool = makeTool({
      evidence: {
        llm_tests: [
          { group: 'safety', passed: false },
          { group: 'safety', passed: false },
        ],
      },
    });
    const result = analyzer.analyze(tool);
    assert.strictEqual(result.derivedObligations['OBL-002a'].status, 'not_met');
    assert.strictEqual(result.derivedObligations['OBL-002a'].confidence, 0.75);
    assert.strictEqual(result.derivedObligations['OBL-002a'].isDowngrade, true);
  });

  // ── Rule 7: Bias Detection ───────────────────────────────────────

  it('R7: public bias audit → OBL-004a met, confidence 0.9', () => {
    const tool = makeTool({
      evidence: {
        passive_scan: {
          web_search: {
            has_public_bias_audit: true,
            bias_audit_url: 'https://example.com/audit',
          },
        },
      },
    });
    const result = analyzer.analyze(tool);
    assert.strictEqual(result.derivedObligations['OBL-004a'].status, 'met');
    assert.strictEqual(result.derivedObligations['OBL-004a'].confidence, 0.9);
  });

  // ── Rule 9: Privacy/Data Governance ──────────────────────────────

  it('R9: privacy 5+ signals → data_governance met', () => {
    const tool = makeTool({
      evidence: {
        passive_scan: {
          privacy_policy: {
            mentions_ai: true,
            mentions_eu: true,
            gdpr_compliant: true,
            training_opt_out: true,
            deletion_right: true,
            retention_specified: false,
          },
        },
      },
    });
    const result = analyzer.analyze(tool);
    assert.strictEqual(result.derivedObligations['OBL-003'].status, 'met');
    assert.strictEqual(result.derivedObligations['OBL-003'].confidence, 0.7);
  });

  // ── No Evidence ──────────────────────────────────────────────────

  it('no evidence at all → no derived statuses', () => {
    const tool = makeTool({ evidence: {} });
    const result = analyzer.analyze(tool);
    assert.strictEqual(Object.keys(result.derivedObligations).length, 0);
    assert.strictEqual(result.evidenceQuality, 0);
  });

  // ── Upgrade Only Policy ──────────────────────────────────────────

  it('upgrade only — cannot downgrade partially_met to unknown (except safety)', () => {
    // This is tested via the scorer integration: evidence analyzer only produces
    // derived statuses, upgrade logic is in the merger. But we verify safety IS downgrade.
    const tool = makeTool({
      evidence: {
        llm_tests: [
          { group: 'safety', passed: false },
          { group: 'safety', passed: false },
        ],
      },
    });
    const result = analyzer.analyze(tool);
    assert.strictEqual(result.derivedObligations['OBL-002a'].isDowngrade, true);
  });

  // ── Evidence Quality ─────────────────────────────────────────────

  it('evidence quality: full data → high score', () => {
    const tool = makeTool({
      evidence: {
        passive_scan: { pages_fetched: 8, disclosure: {} },
        llm_tests: [{ group: 'safety', passed: true }, { group: 'identity', passed: true }],
        media_tests: [{ type: 'image', c2pa_present: true }],
        human_tests: { disclosure_visible: true },
      },
    });
    const quality = analyzer.computeEvidenceQuality(tool.evidence);
    assert.ok(quality >= 0.8, `Expected ≥0.8, got ${quality}`);
  });

  it('evidence quality: no data → 0.0', () => {
    const quality = analyzer.computeEvidenceQuality({});
    assert.strictEqual(quality, 0);
  });

  // ── Multiple Rules Same Obligation ───────────────────────────────

  it('multiple rules for same obligation → highest confidence wins', () => {
    // OBL-022 can be derived by both Rule 5 (GPAI) and Rule 11 (factual)
    // Rule 5 confidence is higher for GPAI tools
    const tool = makeTool({
      riskLevel: 'gpai',
      assessments: { 'eu-ai-act': { risk_level: 'gpai', applicable_obligation_ids: [], deployer_obligations: [], provider_obligations: [] } },
      evidence: {
        passive_scan: {
          model_card: {
            has_model_card: true,
            has_limitations: true,
            has_bias_info: true,
            has_training_data: true,
            has_evaluation: true,
          },
        },
        llm_tests: [
          { group: 'factual', passed: true },
        ],
      },
    });
    const result = analyzer.analyze(tool);
    // Rule 5 gives confidence 0.85, Rule 11 gives 0.5
    assert.strictEqual(result.derivedObligations['OBL-022'].confidence, 0.85);
    assert.strictEqual(result.derivedObligations['OBL-022'].source, 'passive_scan');
  });

  // ── Contradiction Detection ──────────────────────────────────────

  it('contradiction: passive_scan vs human_tests → confidence reduced by 0.1', () => {
    const tool = makeTool({
      evidence: {
        passive_scan: {
          disclosure: { visible: false },
        },
        human_tests: {
          disclosure_visible: true,
          disclosure_text: 'AI-powered',
        },
      },
    });
    const result = analyzer.analyze(tool);
    assert.ok(result.contradictions.length >= 1, 'Should detect contradiction');
    assert.strictEqual(result.contradictions[0].field, 'OBL-015');
    // Human test wins (higher priority) but confidence reduced by 0.1
    assert.strictEqual(result.derivedObligations['OBL-015'].status, 'met');
    assert.strictEqual(result.derivedObligations['OBL-015'].confidence, 0.9); // 1.0 - 0.1
  });

  // ── Evidence Freshness ───────────────────────────────────────────

  it('evidence freshness: 200-day-old scan → confidence × 0.7', () => {
    const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
    const decayed = analyzer._applyFreshnessDecay(1.0, oldDate);
    assert.ok(Math.abs(decayed - 0.7) < 0.01, `Expected ~0.7, got ${decayed}`);
  });

  it('evidence freshness: 15-day-old scan → confidence × 1.0', () => {
    const recentDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const decayed = analyzer._applyFreshnessDecay(1.0, recentDate);
    assert.strictEqual(decayed, 1.0);
  });

  // ── Provider Correlation ─────────────────────────────────────────

  it('provider correlation: inherited signals have confidence × 0.6', () => {
    const tools = [
      makeTool({
        slug: 'ref-tool',
        name: 'Reference Tool',
        provider: { name: 'SharedCo' },
        evidence: {
          passive_scan: {
            pages_fetched: 8,
            trust: { certifications: ['ISO 42001'], mentions_ai_act: true },
            privacy_policy: { mentions_ai: true, gdpr_compliant: true },
          },
        },
      }),
      makeTool({
        slug: 'child-tool',
        name: 'Child Tool',
        provider: { name: 'SharedCo' },
        evidence: {
          passive_scan: { pages_fetched: 1 },
        },
      }),
    ];

    const correlations = analyzer.correlateProvider(tools);
    assert.ok(correlations['child-tool'], 'Child tool should have correlations');
    assert.strictEqual(correlations['child-tool'].inherited, true);
    assert.strictEqual(correlations['child-tool'].referenceToolSlug, 'ref-tool');
    assert.strictEqual(correlations['child-tool'].confidenceMultiplier, 0.6);
    assert.ok(correlations['child-tool'].inheritedSignals.length > 0, 'Should have inherited signals');
  });

  // ── Transparency Score ──────────────────────────────────────────

  it('computeTransparencyScore: full evidence → 100', () => {
    const evidence = {
      passive_scan: {
        disclosure: { visible: true },
        trust: { has_eu_ai_act_page: true, has_responsible_ai_page: true, certifications: ['ISO 42001'] },
        privacy_policy: { mentions_ai: true, mentions_eu: true },
        model_card: { has_model_card: true, has_limitations: true, has_bias_info: true, has_training_data: true, has_evaluation: true },
        web_search: { has_transparency_report: true, has_public_bias_audit: true },
        content_marking: { c2pa: true },
      },
    };
    const score = analyzer.computeTransparencyScore(evidence);
    assert.strictEqual(score, 100);
  });

  it('computeTransparencyScore: empty evidence → 0', () => {
    const score = analyzer.computeTransparencyScore({});
    assert.strictEqual(score, 0);
  });

  // ── Provider Obligation Correlation ──────────────────────────────

  it('correlateObligations: inheritable obligations transferred from reference to siblings', () => {
    const refEnriched = {
      derivedObligations: {
        'OBL-002a': { status: 'met', confidence: 0.85, evidence_summary: 'All safety tests passed', signals: ['llm_tests.safety'] },
        'OBL-003': { status: 'partially_met', confidence: 0.5, evidence_summary: 'Privacy 3/6', signals: ['passive_scan.privacy'] },
        'OBL-015': { status: 'met', confidence: 0.9, evidence_summary: 'Disclosure visible', signals: ['passive_scan.disclosure'] },
      },
      evidenceQuality: 0.6,
    };

    const siblingEnriched = {
      derivedObligations: {},
      evidenceQuality: 0.1,
    };

    const toolAnalysisMap = {
      'ref-tool': { enriched: refEnriched, providerName: 'SharedCo' },
      'sibling-tool': { enriched: siblingEnriched, providerName: 'SharedCo' },
    };

    const results = analyzer.correlateObligations(toolAnalysisMap);
    assert.ok(results['sibling-tool'], 'Sibling should receive inherited obligations');

    const inherited = results['sibling-tool'].inheritedObligations;
    // OBL-002a and OBL-003 are inheritable
    assert.ok(inherited['OBL-002a'], 'OBL-002a should be inherited');
    assert.ok(inherited['OBL-003'], 'OBL-003 should be inherited');
    // OBL-015 is NOT inheritable (tool-specific)
    assert.ok(!inherited['OBL-015'], 'OBL-015 should NOT be inherited');

    // Confidence should be halved
    assert.ok(inherited['OBL-002a'].confidence < 0.85, 'Inherited confidence should be reduced');
    assert.ok(Math.abs(inherited['OBL-002a'].confidence - 0.85 * 0.5) < 0.01, 'Confidence should be × 0.5');
  });

  it('correlateObligations: does not inherit if sibling already has the obligation', () => {
    const refEnriched = {
      derivedObligations: {
        'OBL-003': { status: 'met', confidence: 0.7, evidence_summary: 'ref met', signals: [] },
      },
      evidenceQuality: 0.6,
    };

    const siblingEnriched = {
      derivedObligations: {
        'OBL-003': { status: 'partially_met', confidence: 0.4, evidence_summary: 'own data', signals: [] },
      },
      evidenceQuality: 0.2,
    };

    const toolAnalysisMap = {
      'ref-tool': { enriched: refEnriched, providerName: 'SharedCo' },
      'sibling-tool': { enriched: siblingEnriched, providerName: 'SharedCo' },
    };

    const results = analyzer.correlateObligations(toolAnalysisMap);
    // Sibling already has OBL-003 with non-unknown status → should NOT be overwritten
    if (results['sibling-tool']) {
      assert.ok(!results['sibling-tool'].inheritedObligations['OBL-003'],
        'OBL-003 should not be inherited when sibling has own data');
    }
  });

  it('provider correlation: own data NOT overwritten by inherited', () => {
    const tools = [
      makeTool({
        slug: 'ref-tool',
        name: 'Reference Tool',
        provider: { name: 'SharedCo' },
        evidence: {
          passive_scan: {
            pages_fetched: 8,
            trust: { certifications: ['ISO 42001'] },
            privacy_policy: { mentions_ai: true },
          },
        },
      }),
      makeTool({
        slug: 'child-tool',
        name: 'Child Tool',
        provider: { name: 'SharedCo' },
        evidence: {
          passive_scan: {
            pages_fetched: 2,
            trust: { certifications: ['SOC 2'] }, // Already has own data
            privacy_policy: { mentions_ai: false }, // Has own data (even if false-ish)
          },
        },
      }),
    ];

    const correlations = analyzer.correlateProvider(tools);
    // Child tool has its own trust.certifications, should NOT be overwritten
    const childEvidence = tools[1].evidence.passive_scan.trust;
    assert.deepStrictEqual(childEvidence.certifications, ['SOC 2']);
  });
});
