'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createTestSandbox, loadAppModule } = require('./helpers/test-sandbox.js');

describe('QuickCheckAssessor', () => {
  let assess;

  const loadAssessor = async () => {
    const sandbox = createTestSandbox({});
    const mod = await loadAppModule(
      'domain/classification/services/QuickCheckAssessor.js', sandbox,
    );
    return mod.assess;
  };

  it('returns applies=true when deploysAI=true', async () => {
    assess = await loadAssessor();
    const result = assess({
      deploysAI: true,
      aiAffectsPersons: false,
      domain: 'other',
      aiMakesDecisions: false,
    });
    assert.strictEqual(result.applies, true);
  });

  it('returns applies=false when deploysAI=false', async () => {
    assess = await loadAssessor();
    const result = assess({
      deploysAI: false,
      aiAffectsPersons: false,
      domain: 'other',
      aiMakesDecisions: false,
    });
    assert.strictEqual(result.applies, false);
    assert.strictEqual(result.findings.length, 1);
    assert.strictEqual(result.findings[0].article, 'Art. 2');
  });

  it('flags high-risk for Annex III domains', async () => {
    assess = await loadAssessor();
    const domains = [
      'biometrics', 'critical_infrastructure', 'education', 'employment',
      'essential_services', 'law_enforcement', 'migration', 'justice',
    ];
    for (const d of domains) {
      const result = assess({
        deploysAI: true,
        aiAffectsPersons: false,
        domain: d,
        aiMakesDecisions: false,
      });
      assert.strictEqual(result.highRiskAreas.length, 1,
        `Expected high-risk area for domain: ${d}`);
      assert.ok(result.highRiskAreas[0].startsWith('Annex III'),
        `Expected Annex III label for domain: ${d}`);
    }
  });

  it('requires literacy when AI Act applies', async () => {
    assess = await loadAssessor();
    const result = assess({
      deploysAI: true,
      aiAffectsPersons: false,
      domain: 'other',
      aiMakesDecisions: false,
    });
    assert.strictEqual(result.literacyRequired, true);
    assert.ok(result.obligations.some((o) => o.includes('Art. 4')));
  });

  it('adds transparency obligation when aiAffectsPersons=true', async () => {
    assess = await loadAssessor();
    const result = assess({
      deploysAI: true,
      aiAffectsPersons: true,
      domain: 'other',
      aiMakesDecisions: false,
    });
    assert.ok(result.obligations.some((o) => o.includes('Art. 50')));
    assert.ok(result.findings.some((f) => f.article === 'Art. 50'));
  });

  it('adds full obligations list for high-risk domain with decisions', async () => {
    assess = await loadAssessor();
    const result = assess({
      deploysAI: true,
      aiAffectsPersons: true,
      domain: 'employment',
      aiMakesDecisions: true,
    });
    assert.ok(result.highRiskAreas.length > 0);
    assert.ok(result.obligations.some((o) => o.includes('Risk Management System')));
    assert.ok(result.obligations.some((o) => o.includes('Technical Documentation')));
    assert.ok(result.obligations.some((o) => o.includes('Human Oversight')));
    assert.ok(result.findings.some((f) => f.severity === 'critical'));
  });
});
