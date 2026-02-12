'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

const noopDb = { query: async () => ({ rows: [] }) };

describe('ComplianceScoreCalculator', () => {
  it('returns 0 for empty requirements', async () => {
    const { domain } = await buildFullSandbox(noopDb);
    const calc = domain.classification.services.ComplianceScoreCalculator;
    assert.strictEqual(calc.calculateToolScore([]), 0);
  });

  it('returns 100 when all completed', async () => {
    const { domain } = await buildFullSandbox(noopDb);
    const calc = domain.classification.services.ComplianceScoreCalculator;
    const reqs = [
      { status: 'completed', progress: 100 },
      { status: 'completed', progress: 100 },
      { status: 'completed', progress: 100 },
    ];
    assert.strictEqual(calc.calculateToolScore(reqs), 100);
  });

  it('excludes not_applicable from denominator', async () => {
    const { domain } = await buildFullSandbox(noopDb);
    const calc = domain.classification.services.ComplianceScoreCalculator;
    const reqs = [
      { status: 'completed', progress: 100 },
      { status: 'not_applicable', progress: 0 },
    ];
    assert.strictEqual(calc.calculateToolScore(reqs), 100);
  });

  it('calculates partial progress correctly', async () => {
    const { domain } = await buildFullSandbox(noopDb);
    const calc = domain.classification.services.ComplianceScoreCalculator;
    const reqs = [
      { status: 'completed', progress: 100 },
      { status: 'in_progress', progress: 50 },
    ];
    // (100 + 50) / (2 * 100) * 100 = 75
    assert.strictEqual(calc.calculateToolScore(reqs), 75);
  });

  it('calculates org score as average of tool scores', async () => {
    const { domain } = await buildFullSandbox(noopDb);
    const calc = domain.classification.services.ComplianceScoreCalculator;
    assert.strictEqual(calc.calculateOrgScore([100, 50, 0]), 50);
  });

  it('groups requirements by article reference', async () => {
    const { domain } = await buildFullSandbox(noopDb);
    const calc = domain.classification.services.ComplianceScoreCalculator;
    const reqs = [
      { articleReference: 'Art. 4', status: 'completed' },
      { articleReference: 'Art. 4', status: 'pending' },
      { articleReference: 'Art. 26', status: 'in_progress' },
      { articleReference: 'Art. 26', status: 'not_applicable' },
    ];
    const groups = calc.groupByArticle(reqs);
    assert.strictEqual(groups.length, 2);

    const art4 = groups.find((g) => g.articleReference === 'Art. 4');
    assert.strictEqual(art4.total, 2);
    assert.strictEqual(art4.completed, 1);

    const art26 = groups.find((g) => g.articleReference === 'Art. 26');
    assert.strictEqual(art26.total, 1); // not_applicable excluded
    assert.strictEqual(art26.completed, 0);
  });
});
