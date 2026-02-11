'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { loadAppModule, createTestSandbox } = require('./helpers/test-sandbox.js');

describe('RuleEngine', () => {
  let RuleEngine;

  const createMockDb = () => ({ query: async () => ({ rows: [] }) });

  it('loads successfully', async () => {
    const sandbox = createTestSandbox(createMockDb());
    RuleEngine = await loadAppModule(
      'application/classification/services/RuleEngine.js', sandbox,
    );
    assert(RuleEngine);
    assert(typeof RuleEngine.classify === 'function');
  });

  // ─── Art. 5 Prohibited Practices ─────────────────────────────────

  describe('Art. 5 — Prohibited Practices', () => {
    it('5(1)(a): detects subliminal/manipulative techniques', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Subliminal advertising to influence purchasing decisions',
        affectsNaturalPersons: true,
      });
      assert.strictEqual(result.riskLevel, 'prohibited');
      assert.strictEqual(result.confidence, 95);
      assert(result.matchedRules[0].includes('Art. 5(1)(a)'));
    });

    it('5(1)(a): does not trigger without affectsNaturalPersons', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Subliminal message testing for research',
        affectsNaturalPersons: false,
      });
      assert.notStrictEqual(result.riskLevel, 'prohibited');
    });

    it('5(1)(b): detects vulnerability exploitation', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Exploit vulnerable elderly users for financial products',
        vulnerableGroups: true,
        affectsNaturalPersons: true,
      });
      assert.strictEqual(result.riskLevel, 'prohibited');
      assert(result.matchedRules[0].includes('Art. 5(1)(b)'));
    });

    it('5(1)(c): detects social scoring', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Social scoring system to rate citizen behavior',
        affectsNaturalPersons: true,
      });
      assert.strictEqual(result.riskLevel, 'prohibited');
      assert(result.matchedRules[0].includes('Art. 5(1)(c)'));
    });

    it('5(1)(d): detects criminal prediction by sole profiling', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Criminal prediction based on personality traits',
        affectsNaturalPersons: true,
      });
      assert.strictEqual(result.riskLevel, 'prohibited');
      assert(result.matchedRules[0].includes('Art. 5(1)(d)'));
    });

    it('5(1)(d): allows criminal prediction with objective facts', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Criminal prediction supporting human assessment based on objective facts',
        affectsNaturalPersons: true,
        domain: 'law_enforcement',
      });
      assert.notStrictEqual(result.riskLevel, 'prohibited');
    });

    it('5(1)(e): detects untargeted facial scraping', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Building a face database by facial scraping from the internet',
      });
      assert.strictEqual(result.riskLevel, 'prohibited');
      assert(result.matchedRules[0].includes('Art. 5(1)(e)'));
    });

    it('5(1)(f): detects workplace emotion recognition', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Emotion recognition for employee productivity monitoring',
        domain: 'employment',
        dataTypes: ['biometric'],
      });
      assert.strictEqual(result.riskLevel, 'prohibited');
      assert(result.matchedRules[0].includes('Art. 5(1)(f)'));
    });

    it('5(1)(f): allows emotion recognition for medical purposes', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Emotion recognition for medical diagnostics and safety',
        domain: 'employment',
        dataTypes: ['biometric'],
      });
      assert.notStrictEqual(result.riskLevel, 'prohibited');
    });

    it('5(1)(g): detects biometric categorization by race', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Categorization of individuals by race using facial biometrics',
        dataTypes: ['biometric'],
      });
      assert.strictEqual(result.riskLevel, 'prohibited');
      assert(result.matchedRules[0].includes('Art. 5(1)(g)'));
    });

    it('5(1)(h): detects real-time remote biometric ID in public', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Real-time biometric identification in public spaces',
        dataTypes: ['biometric'],
      });
      assert.strictEqual(result.riskLevel, 'prohibited');
      assert(result.matchedRules[0].includes('Art. 5(1)(h)'));
    });
  });

  // ─── Annex III High-Risk ───────────────────────────────────────────

  describe('Annex III — High-Risk Domains', () => {
    const annexDomains = [
      'biometrics', 'critical_infrastructure', 'education', 'employment',
      'essential_services', 'law_enforcement', 'migration', 'justice',
    ];

    for (const domain of annexDomains) {
      it(`classifies ${domain} domain as high-risk`, async () => {
        const sandbox = createTestSandbox(createMockDb());
        const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
        const result = engine.classify({
          domain,
          purpose: 'General tool usage in this domain',
        });
        assert.strictEqual(result.riskLevel, 'high');
        assert(result.annexCategory);
      });
    }

    it('profiling override: always high-risk, no exceptions', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        domain: 'employment',
        purpose: 'Candidate screening and profiling for recruitment',
        affectsNaturalPersons: true,
        autonomyLevel: 'advisory',
        humanOversight: true,
      });
      assert.strictEqual(result.riskLevel, 'high');
      assert.strictEqual(result.confidence, 95);
      assert(result.matchedRules[0].includes('Profiling Override'));
    });

    it('Art. 6(3) exception: narrow procedural + advisory + oversight', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        domain: 'education',
        purpose: 'Narrow procedural task: simple lookup of student records',
        autonomyLevel: 'advisory',
        humanOversight: true,
        affectsNaturalPersons: false,
      });
      assert.strictEqual(result.riskLevel, 'limited');
      assert.strictEqual(result.confidence, 75);
    });

    it('Art. 6(3) exception does NOT apply without advisory/oversight', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        domain: 'education',
        purpose: 'Narrow procedural task: automated grading',
        autonomyLevel: 'autonomous',
        humanOversight: false,
      });
      assert.strictEqual(result.riskLevel, 'high');
    });
  });

  // ─── GPAI Detection ────────────────────────────────────────────────

  describe('GPAI Detection', () => {
    it('detects GPAI from catalog default risk', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        domain: 'other',
        purpose: 'General purpose AI model',
        catalogDefaultRisk: 'gpai',
      });
      assert.strictEqual(result.riskLevel, 'gpai');
      assert.strictEqual(result.confidence, 85);
    });
  });

  // ─── Art. 50 Transparency ──────────────────────────────────────────

  describe('Art. 50 — Transparency (Limited Risk)', () => {
    it('detects chatbot as limited risk', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Customer chatbot for support inquiries',
        domain: 'customer_service',
      });
      assert.strictEqual(result.riskLevel, 'limited');
      assert(result.matchedRules[0].includes('Art. 50(1)'));
    });

    it('detects content generation as limited risk', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'AI-powered content generation for marketing',
        domain: 'marketing',
      });
      assert.strictEqual(result.riskLevel, 'limited');
      assert(result.matchedRules[0].includes('Art. 50(2)'));
    });

    it('detects deepfakes as limited risk', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Image generation for creative design',
        domain: 'marketing',
      });
      assert.strictEqual(result.riskLevel, 'limited');
    });

    it('detects emotion recognition transparency (non-prohibited domain)', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Customer emotion analysis for service improvement',
        domain: 'customer_service',
        dataTypes: ['biometric'],
      });
      assert.strictEqual(result.riskLevel, 'limited');
      assert(result.matchedRules[0].includes('Art. 50(3)'));
    });

    it('uses catalog default limited risk', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        purpose: 'Internal tool',
        domain: 'other',
        catalogDefaultRisk: 'limited',
      });
      assert.strictEqual(result.riskLevel, 'limited');
    });
  });

  // ─── Context Modifiers ─────────────────────────────────────────────

  describe('Context Modifiers', () => {
    it('escalates when vulnerable groups are involved', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        domain: 'other',
        purpose: 'Internal analytics',
        vulnerableGroups: true,
        affectsNaturalPersons: true,
      });
      assert.strictEqual(result.riskLevel, 'limited');
      assert.strictEqual(result.confidence, 75);
    });

    it('escalates for autonomous + no oversight', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        domain: 'other',
        purpose: 'Internal operations',
        autonomyLevel: 'autonomous',
        humanOversight: false,
        affectsNaturalPersons: true,
      });
      assert.strictEqual(result.riskLevel, 'limited');
      assert.strictEqual(result.confidence, 75);
    });

    it('double escalation: vulnerable + autonomous + no oversight', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        domain: 'other',
        purpose: 'Internal operations',
        vulnerableGroups: true,
        autonomyLevel: 'autonomous',
        humanOversight: false,
        affectsNaturalPersons: true,
      });
      assert.strictEqual(result.riskLevel, 'high');
    });
  });

  // ─── Default Minimal ───────────────────────────────────────────────

  describe('Default Minimal', () => {
    it('returns minimal for safe internal coding tool', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        name: 'Internal Linter',
        domain: 'coding',
        purpose: 'Static code analysis for internal use',
        dataTypes: ['personal'],
        affectedPersons: ['employees'],
        autonomyLevel: 'advisory',
        humanOversight: true,
        affectsNaturalPersons: false,
      });
      assert.strictEqual(result.riskLevel, 'minimal');
      assert.strictEqual(result.confidence, 60);
    });
  });

  // ─── Catalog Default High ──────────────────────────────────────────

  describe('Catalog Default High', () => {
    it('uses catalog high risk for non-Annex-III domain', async () => {
      const sandbox = createTestSandbox(createMockDb());
      const engine = await loadAppModule('application/classification/services/RuleEngine.js', sandbox);
      const result = engine.classify({
        domain: 'other',
        purpose: 'Medical device control',
        catalogDefaultRisk: 'high',
      });
      assert.strictEqual(result.riskLevel, 'high');
      assert.strictEqual(result.confidence, 85);
    });
  });
});
