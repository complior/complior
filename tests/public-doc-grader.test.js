'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const loadModule = (filePath) => {
  const src = fs.readFileSync(filePath, 'utf8');
  return vm.runInThisContext(src, { filename: filePath });
};

const graderPath = path.join(__dirname, '../app/domain/registry/public-doc-grader.js');

describe('Public Documentation Grader', () => {
  let grader;

  const makeGrader = () => {
    const factory = loadModule(graderPath);
    return factory();
  };

  const makeTool = (passiveScan, aiActRole = null) => ({
    aiActRole,
    evidence: { passive_scan: passiveScan },
  });

  it('should load as VM sandbox module', () => {
    grader = makeGrader();
    assert.ok(grader);
    assert.strictEqual(typeof grader.grade, 'function');
  });

  it('provider tool with all 9 signals → grade A+', () => {
    grader = makeGrader();
    const tool = makeTool({
      disclosure: { visible: true },
      model_card: { has_model_card: true, has_limitations: true, has_bias_info: true, has_training_data: true },
      privacy_policy: { mentions_ai: true },
      trust: { has_eu_ai_act_page: true, has_responsible_ai_page: true },
      web_search: { has_transparency_report: true },
      content_marking: { c2pa: true },
    }, 'provider');

    const result = grader.grade(tool);
    assert.strictEqual(result.grade, 'A+');
    assert.strictEqual(result.score, 9);
    assert.strictEqual(result.total, 9);
    assert.strictEqual(result.percent, 100);
    assert.strictEqual(result.checklist, 'provider');
    assert.ok(result.gradedAt);
    assert.strictEqual(result.items.length, 9);
    assert.ok(result.items.every((item) => item.found === true));
  });

  it('provider tool with 0 signals → grade F', () => {
    grader = makeGrader();
    const tool = makeTool({}, 'provider');

    const result = grader.grade(tool);
    assert.strictEqual(result.grade, 'F');
    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.percent, 0);
    assert.ok(result.items.every((item) => item.found === false));
  });

  it('provider tool with 5 signals → grade B', () => {
    grader = makeGrader();
    const tool = makeTool({
      disclosure: { visible: true },
      model_card: { has_model_card: true },
      privacy_policy: { mentions_ai: true },
      trust: { has_eu_ai_act_page: true, has_responsible_ai_page: true },
    }, 'provider');

    const result = grader.grade(tool);
    assert.strictEqual(result.score, 5);
    assert.strictEqual(result.grade, 'B');
  });

  it('deployer_product tool uses deployer checklist', () => {
    grader = makeGrader();
    const tool = makeTool({
      disclosure: { visible: true },
      privacy_policy: { mentions_ai: true, mentions_eu: true, training_opt_out: true },
      trust: { has_eu_ai_act_page: true, has_responsible_ai_page: true, certifications: ['ISO 42001'] },
      web_search: { has_public_bias_audit: true, has_transparency_report: true },
    }, 'deployer_product');

    const result = grader.grade(tool);
    assert.strictEqual(result.checklist, 'deployer_product');
    assert.strictEqual(result.score, 9);
    assert.strictEqual(result.grade, 'A+');
  });

  it('tool without aiActRole defaults to provider checklist', () => {
    grader = makeGrader();
    const tool = makeTool({ disclosure: { visible: true } });

    const result = grader.grade(tool);
    assert.strictEqual(result.checklist, 'provider');
    assert.strictEqual(result.score, 1);
  });

  it('tool without evidence → grade F', () => {
    grader = makeGrader();
    const tool = { evidence: null, aiActRole: null };

    const result = grader.grade(tool);
    assert.strictEqual(result.grade, 'F');
    assert.strictEqual(result.score, 0);
  });

  it('grade boundaries — each count maps to correct grade', () => {
    grader = makeGrader();
    const expected = {
      0: 'F', 1: 'D-', 2: 'D', 3: 'C', 4: 'B-',
      5: 'B', 6: 'B+', 7: 'A-', 8: 'A', 9: 'A+',
    };

    // Build signals incrementally for provider checklist
    const signals = [
      { disclosure: { visible: true } },
      { model_card: { has_model_card: true } },
      { model_card: { has_limitations: true, has_bias_info: true } },
      { model_card: { has_training_data: true } },
      { privacy_policy: { mentions_ai: true } },
      { trust: { has_eu_ai_act_page: true } },
      { trust: { has_responsible_ai_page: true } },
      { web_search: { has_transparency_report: true } },
      { content_marking: { c2pa: true } },
    ];

    for (let count = 0; count <= 9; count++) {
      // Merge first N signal objects into one passive_scan
      const ps = {};
      for (let i = 0; i < count; i++) {
        for (const [key, val] of Object.entries(signals[i])) {
          ps[key] = { ...(ps[key] || {}), ...val };
        }
      }
      const tool = makeTool(ps, 'provider');
      const result = grader.grade(tool);
      assert.strictEqual(result.score, count, `Expected score ${count} for ${count} signals`);
      assert.strictEqual(result.grade, expected[count], `Expected grade ${expected[count]} for count ${count}, got ${result.grade}`);
    }
  });

  it('OR signal: content_marking matches c2pa or watermark', () => {
    grader = makeGrader();

    const toolC2pa = makeTool({ content_marking: { c2pa: true } }, 'provider');
    const resultC2pa = grader.grade(toolC2pa);
    const markingItem = resultC2pa.items.find((i) => i.id === 'content_marking');
    assert.strictEqual(markingItem.found, true);

    const toolWatermark = makeTool({ content_marking: { watermark: true } }, 'provider');
    const resultWm = grader.grade(toolWatermark);
    const wmItem = resultWm.items.find((i) => i.id === 'content_marking');
    assert.strictEqual(wmItem.found, true);
  });

  it('AND signal: model_limitations requires both has_limitations AND has_bias_info', () => {
    grader = makeGrader();

    // Only one present → not found
    const toolPartial = makeTool({ model_card: { has_limitations: true } }, 'provider');
    const partialResult = grader.grade(toolPartial);
    const partialItem = partialResult.items.find((i) => i.id === 'model_limitations');
    assert.strictEqual(partialItem.found, false);

    // Both present → found
    const toolBoth = makeTool({ model_card: { has_limitations: true, has_bias_info: true } }, 'provider');
    const bothResult = grader.grade(toolBoth);
    const bothItem = bothResult.items.find((i) => i.id === 'model_limitations');
    assert.strictEqual(bothItem.found, true);
  });

  it('certifications signal: trust.certifications.length > 0', () => {
    grader = makeGrader();

    // Empty array
    const toolEmpty = makeTool({ trust: { certifications: [] } }, 'deployer_product');
    const emptyResult = grader.grade(toolEmpty);
    const emptyItem = emptyResult.items.find((i) => i.id === 'certifications');
    assert.strictEqual(emptyItem.found, false);

    // Has certifications
    const toolCert = makeTool({ trust: { certifications: ['ISO 42001'] } }, 'deployer_product');
    const certResult = grader.grade(toolCert);
    const certItem = certResult.items.find((i) => i.id === 'certifications');
    assert.strictEqual(certItem.found, true);
  });

  it('roleOverride param forces specific checklist', () => {
    grader = makeGrader();
    const tool = makeTool({ disclosure: { visible: true } }, 'provider');

    const result = grader.grade(tool, 'deployer_product');
    assert.strictEqual(result.checklist, 'deployer_product');
  });
});
