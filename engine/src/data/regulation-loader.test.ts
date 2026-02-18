import { describe, it, expect, beforeEach } from 'vitest';
import { loadRegulationData, clearRegulationCache } from './regulation-loader.js';

describe('RegulationLoader', () => {
  beforeEach(() => {
    clearRegulationCache();
  });

  it('should load all 8 regulation files successfully', async () => {
    const data = await loadRegulationData();

    expect(data.obligations).toBeDefined();
    expect(data.technicalRequirements).toBeDefined();
    expect(data.scoring).toBeDefined();
    expect(data.regulationMeta).toBeDefined();
    expect(data.applicabilityTree).toBeDefined();
    expect(data.crossMapping).toBeDefined();
    expect(data.localization).toBeDefined();
    expect(data.timeline).toBeDefined();
  });

  it('should validate obligations schema', async () => {
    const data = await loadRegulationData();

    expect(data.obligations._version).toBe('2.0');
    expect(data.obligations.obligations.length).toBeGreaterThan(0);

    const firstObligation = data.obligations.obligations[0];
    expect(firstObligation?.obligation_id).toMatch(/^eu-ai-act-OBL-/);
    expect(firstObligation?.article_reference).toBeDefined();
    expect(firstObligation?.title).toBeDefined();
    expect(firstObligation?.severity).toBeDefined();
    expect(firstObligation?.applies_to_risk_level).toBeInstanceOf(Array);
  });

  it('should validate scoring schema', async () => {
    const data = await loadRegulationData();
    const scoring = data.scoring.scoring;

    expect(scoring.regulation_id).toBe('eu-ai-act');
    expect(scoring.total_obligations).toBeGreaterThan(0);
    expect(scoring.critical_obligation_ids.length).toBeGreaterThan(0);
    expect(scoring.weighted_categories.length).toBeGreaterThan(0);
    expect(scoring.thresholds.red).toBeDefined();
    expect(scoring.thresholds.yellow).toBeDefined();
    expect(scoring.thresholds.green).toBeDefined();

    const totalWeight = scoring.weighted_categories.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('should validate technical-requirements schema', async () => {
    const data = await loadRegulationData();

    expect(data.technicalRequirements._version).toBe('2.0');
    expect(data.technicalRequirements.technical_requirements.length).toBeGreaterThan(0);

    const first = data.technicalRequirements.technical_requirements[0];
    expect(first?.obligation_id).toMatch(/^eu-ai-act-OBL-/);
    expect(first?.feature_type).toBeDefined();
  });

  it('should validate regulation-meta schema', async () => {
    const data = await loadRegulationData();
    const meta = data.regulationMeta.stage_1_metadata;

    expect(meta.regulation_id).toBe('eu-ai-act');
    expect(meta.status).toBe('in-force');
    expect(meta.extraterritorial).toBe(true);
    expect(meta.risk_levels.length).toBeGreaterThan(0);
    expect(data.regulationMeta.stage_2_role_mapping.roles.length).toBeGreaterThan(0);
    expect(data.regulationMeta.stage_3_risk_classification.levels.length).toBeGreaterThan(0);
  });

  it('should validate applicability-tree schema', async () => {
    const data = await loadRegulationData();
    const tree = data.applicabilityTree.applicability_tree;

    expect(tree.regulation_id).toBe('eu-ai-act');
    expect(tree.root_question).toBe('Q1');
    expect(tree.questions.length).toBeGreaterThan(0);
  });

  it('should validate timeline schema', async () => {
    const data = await loadRegulationData();
    const timeline = data.timeline.timeline;

    expect(timeline.regulation_id).toBe('eu-ai-act');
    expect(timeline.key_dates.length).toBeGreaterThan(0);
    expect(timeline.expected_amendments.length).toBeGreaterThan(0);
  });

  it('should return cached data on second call', async () => {
    const data1 = await loadRegulationData();
    const data2 = await loadRegulationData();

    expect(data1).toBe(data2);
  });

  it('should load within 500ms', async () => {
    const start = performance.now();
    await loadRegulationData();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500);
  });
});
