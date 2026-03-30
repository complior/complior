/**
 * Smoke tests for extracted JSON data files.
 * Validates structure and constraints to catch data corruption early.
 */
import { describe, it, expect } from 'vitest';
import limits from './scanner/limits.json' with { type: 'json' };
import pricing from './llm/model-pricing.json' with { type: 'json' };
import routing from './llm/model-routing.json' with { type: 'json' };
import confidence from './scanner/confidence-params.json' with { type: 'json' };
import checkIds from './scanner/check-id-categories.json' with { type: 'json' };
import evalMappings from './eval/eval-mappings.json' with { type: 'json' };
import riskProfile from './onboarding/risk-profile.json' with { type: 'json' };

const OBL_ID_RE = /^OBL-\d{3}$/;

describe('data integrity', () => {
  it('scanner/limits.json has positive limits', () => {
    expect(limits.max_files).toBeGreaterThan(0);
    expect(limits.max_file_size_bytes).toBeGreaterThan(0);
  });

  it('llm/model-pricing.json has positive input/output for all models', () => {
    const models = Object.entries(pricing.models);
    expect(models.length).toBeGreaterThanOrEqual(10);
    for (const [name, p] of models) {
      expect(p.input, `${name} input`).toBeGreaterThan(0);
      expect(p.output, `${name} output`).toBeGreaterThan(0);
    }
  });

  it('llm/model-routing.json covers all task types for every provider', () => {
    const taskTypes = Object.keys(routing.task_reasons);
    expect(taskTypes.length).toBeGreaterThanOrEqual(6);
    for (const [provider, tasks] of Object.entries(routing.model_map)) {
      for (const tt of taskTypes) {
        expect((tasks as Record<string, string>)[tt], `${provider}.${tt}`).toBeTruthy();
      }
    }
  });

  it('scanner/confidence-params.json has all 5 layers and 5 multipliers', () => {
    expect(Object.keys(confidence.layer_weights)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
    expect(Object.keys(confidence.score_multipliers)).toEqual([
      'PASS', 'LIKELY_PASS', 'UNCERTAIN', 'LIKELY_FAIL', 'FAIL',
    ]);
  });

  it('scanner/check-id-categories.json has non-empty mapping', () => {
    const entries = Object.entries(checkIds.mapping);
    expect(entries.length).toBeGreaterThanOrEqual(70);
    for (const [id, cat] of entries) {
      expect(cat, `category for ${id}`).toBeTruthy();
    }
  });

  it('eval/eval-mappings.json has valid priority/article/fine/timeline entries', () => {
    expect(Object.keys(evalMappings.priority_order)).toEqual(['critical', 'high', 'medium', 'low']);
    expect(Object.keys(evalMappings.category_articles).length).toBeGreaterThanOrEqual(10);
    expect(Object.keys(evalMappings.priority_timeline)).toEqual(['critical', 'high', 'medium', 'low']);
  });

  it('onboarding/risk-profile.json has valid OBL-IDs', () => {
    for (const id of riskProfile.base_obligations) {
      expect(id, `base ${id}`).toMatch(OBL_ID_RE);
    }
    for (const id of riskProfile.high_risk_extra_obligations) {
      expect(id, `extra ${id}`).toMatch(OBL_ID_RE);
    }
    for (const [domain, ids] of Object.entries(riskProfile.domain_obligations)) {
      for (const id of ids) {
        expect(id, `${domain} ${id}`).toMatch(OBL_ID_RE);
      }
    }
  });
});
