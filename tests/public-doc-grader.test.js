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

describe('Public Documentation Grader v4.1 — Weighted Scoring', () => {
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

  it('provider tool with all 9 signals → grade A+ (100%)', () => {
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
    assert.strictEqual(result.weightedPercent, 100);
    assert.strictEqual(result.requiredFound, 6);
    assert.strictEqual(result.requiredTotal, 6);
    assert.strictEqual(result.bpFound, 3);
    assert.strictEqual(result.bpTotal, 3);
    assert.strictEqual(result.checklist, 'provider');
    assert.ok(result.gradedAt);
    assert.strictEqual(result.items.length, 9);
    assert.ok(result.items.every((item) => item.found === true));
  });

  it('provider tool with 0 signals → grade F (0%)', () => {
    grader = makeGrader();
    const tool = makeTool({}, 'provider');

    const result = grader.grade(tool);
    assert.strictEqual(result.grade, 'F');
    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.weightedPercent, 0);
    assert.strictEqual(result.requiredFound, 0);
    assert.strictEqual(result.bpFound, 0);
    assert.ok(result.items.every((item) => item.found === false));
  });

  it('all 6 required + 0 best practice → grade A (90%)', () => {
    grader = makeGrader();
    const tool = makeTool({
      disclosure: { visible: true },
      model_card: { has_model_card: true, has_limitations: true, has_bias_info: true, has_training_data: true },
      privacy_policy: { mentions_ai: true },
      content_marking: { c2pa: true },
    }, 'provider');

    const result = grader.grade(tool);
    assert.strictEqual(result.requiredFound, 6);
    assert.strictEqual(result.bpFound, 0);
    assert.strictEqual(result.weightedPercent, 90);
    assert.strictEqual(result.grade, 'A');
  });

  it('0 required + 3 best practice → grade F (10%)', () => {
    grader = makeGrader();
    const tool = makeTool({
      trust: { has_eu_ai_act_page: true, has_responsible_ai_page: true },
      web_search: { has_transparency_report: true },
    }, 'provider');

    const result = grader.grade(tool);
    assert.strictEqual(result.requiredFound, 0);
    assert.strictEqual(result.bpFound, 3);
    assert.strictEqual(result.weightedPercent, 10);
    assert.strictEqual(result.grade, 'F');
  });

  it('5 required + 0 bp → grade B+ (75%)', () => {
    grader = makeGrader();
    const tool = makeTool({
      disclosure: { visible: true },
      model_card: { has_model_card: true, has_limitations: true, has_bias_info: true, has_training_data: true },
      privacy_policy: { mentions_ai: true },
      // no content_marking, no best practices
    }, 'provider');

    const result = grader.grade(tool);
    assert.strictEqual(result.requiredFound, 5);
    assert.strictEqual(result.bpFound, 0);
    assert.strictEqual(result.weightedPercent, 75);
    assert.strictEqual(result.grade, 'B+');
  });

  it('5 required + 3 bp → grade A (85%)', () => {
    grader = makeGrader();
    const tool = makeTool({
      disclosure: { visible: true },
      model_card: { has_model_card: true, has_limitations: true, has_bias_info: true, has_training_data: true },
      privacy_policy: { mentions_ai: true },
      trust: { has_eu_ai_act_page: true, has_responsible_ai_page: true },
      web_search: { has_transparency_report: true },
    }, 'provider');

    const result = grader.grade(tool);
    assert.strictEqual(result.requiredFound, 5);
    assert.strictEqual(result.bpFound, 3);
    assert.strictEqual(result.weightedPercent, 85);
    assert.strictEqual(result.grade, 'A');
  });

  it('3 required + 2 bp → grade B- (52%)', () => {
    grader = makeGrader();
    const tool = makeTool({
      disclosure: { visible: true },
      model_card: { has_model_card: true },
      privacy_policy: { mentions_ai: true },
      trust: { has_eu_ai_act_page: true, has_responsible_ai_page: true },
    }, 'provider');

    const result = grader.grade(tool);
    assert.strictEqual(result.requiredFound, 3);
    assert.strictEqual(result.bpFound, 2);
    assert.strictEqual(result.weightedPercent, 52);
    assert.strictEqual(result.grade, 'B-');
  });

  it('items include tier and legalBasis fields', () => {
    grader = makeGrader();
    const tool = makeTool({}, 'provider');
    const result = grader.grade(tool);

    const requiredItems = result.items.filter((i) => i.tier === 'required');
    const bpItems = result.items.filter((i) => i.tier === 'best_practice');

    assert.strictEqual(requiredItems.length, 6);
    assert.strictEqual(bpItems.length, 3);
    assert.ok(requiredItems.every((i) => i.legalBasis !== null));
    assert.ok(bpItems.every((i) => i.legalBasis === null));
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
    assert.strictEqual(result.requiredFound, 4);
    assert.strictEqual(result.requiredTotal, 4);
    assert.strictEqual(result.bpFound, 5);
    assert.strictEqual(result.bpTotal, 5);
    assert.strictEqual(result.grade, 'A+');
  });

  it('deployer_product: 4 required + 0 bp → grade A (90%)', () => {
    grader = makeGrader();
    const tool = makeTool({
      disclosure: { visible: true },
      privacy_policy: { mentions_ai: true, mentions_eu: true, training_opt_out: true },
    }, 'deployer_product');

    const result = grader.grade(tool);
    assert.strictEqual(result.requiredFound, 4);
    assert.strictEqual(result.bpFound, 0);
    assert.strictEqual(result.weightedPercent, 90);
    assert.strictEqual(result.grade, 'A');
  });

  it('tool without aiActRole defaults to provider checklist', () => {
    grader = makeGrader();
    const tool = makeTool({ disclosure: { visible: true } });

    const result = grader.grade(tool);
    assert.strictEqual(result.checklist, 'provider');
    assert.strictEqual(result.score, 1);
    assert.strictEqual(result.requiredFound, 1);
  });

  it('tool without evidence → grade F', () => {
    grader = makeGrader();
    const tool = { evidence: null, aiActRole: null };

    const result = grader.grade(tool);
    assert.strictEqual(result.grade, 'F');
    assert.strictEqual(result.score, 0);
  });

  it('grade boundaries — weighted scoring (provider, incrementally adding signals)', () => {
    grader = makeGrader();

    // Provider signals in order: first 6 required, then 3 best practice
    // This tests that required items contribute 90% weight
    const signals = [
      { disclosure: { visible: true } },                              // req 1/6 → 15%
      { model_card: { has_model_card: true } },                       // req 2/6 → 30%
      { model_card: { has_limitations: true, has_bias_info: true } }, // req 3/6 → 45%
      { model_card: { has_training_data: true } },                    // req 4/6 → 60%
      { privacy_policy: { mentions_ai: true } },                      // req 5/6 → 75%
      { trust: { has_eu_ai_act_page: true } },                        // bp 1/3 → 75 + 3.33 = 78
      { trust: { has_responsible_ai_page: true } },                    // bp 2/3 → 75 + 6.67 = 82
      { web_search: { has_transparency_report: true } },               // bp 3/3 → 75 + 10 = 85
      { content_marking: { c2pa: true } },                             // req 6/6 → 90 + 10 = 100
    ];

    const expected = [
      { count: 0, grade: 'F', wp: 0 },
      { count: 1, grade: 'D-', wp: 15 },
      { count: 2, grade: 'D', wp: 30 },
      { count: 3, grade: 'C', wp: 45 },
      { count: 4, grade: 'B', wp: 60 },
      { count: 5, grade: 'B+', wp: 75 },
      { count: 6, grade: 'A-', wp: 78 },
      { count: 7, grade: 'A-', wp: 82 },
      { count: 8, grade: 'A', wp: 85 },
      { count: 9, grade: 'A+', wp: 100 },
    ];

    for (const { count, grade: expectedGrade, wp } of expected) {
      const ps = {};
      for (let i = 0; i < count; i++) {
        for (const [key, val] of Object.entries(signals[i])) {
          ps[key] = { ...(ps[key] || {}), ...val };
        }
      }
      const tool = makeTool(ps, 'provider');
      const result = grader.grade(tool);
      assert.strictEqual(result.score, count, `Expected score ${count} for ${count} signals`);
      assert.strictEqual(result.weightedPercent, wp, `Expected weighted ${wp}% for count ${count}, got ${result.weightedPercent}%`);
      assert.strictEqual(result.grade, expectedGrade, `Expected grade ${expectedGrade} for count ${count}, got ${result.grade}`);
    }
  });

  it('best practice alone cannot get good grade', () => {
    grader = makeGrader();
    // All 3 best practice items but 0 required → still F
    const tool = makeTool({
      trust: { has_eu_ai_act_page: true, has_responsible_ai_page: true },
      web_search: { has_transparency_report: true },
    }, 'provider');

    const result = grader.grade(tool);
    assert.strictEqual(result.requiredFound, 0);
    assert.strictEqual(result.bpFound, 3);
    assert.strictEqual(result.weightedPercent, 10);
    assert.strictEqual(result.grade, 'F');
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
