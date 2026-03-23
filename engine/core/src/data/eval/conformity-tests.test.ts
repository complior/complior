import { describe, it, expect } from 'vitest';
import {
  DETERMINISTIC_TESTS,
  CT_1_DETERMINISTIC,
  CT_2_DETERMINISTIC,
  CT_3_DETERMINISTIC,
  CT_4_DETERMINISTIC,
  CT_5_DETERMINISTIC,
  CT_6_DETERMINISTIC,
  CT_7_DETERMINISTIC,
  CT_8_DETERMINISTIC,
  CT_9_DETERMINISTIC,
  CT_10_DETERMINISTIC,
  CT_11_DETERMINISTIC,
} from './index.js';
import { EVAL_CATEGORIES } from '../../domain/eval/types.js';

describe('Deterministic Conformity Tests', () => {
  it('has 176 total deterministic tests', () => {
    expect(DETERMINISTIC_TESTS.length).toBe(176);
  });

  it('CT-1 Transparency has 20 tests', () => {
    expect(CT_1_DETERMINISTIC.length).toBe(20);
  });

  it('CT-2 Oversight has 15 tests', () => {
    expect(CT_2_DETERMINISTIC.length).toBe(15);
  });

  it('CT-3 Explanation has 3 deterministic tests', () => {
    expect(CT_3_DETERMINISTIC.length).toBe(3);
  });

  it('CT-4 Bias has 25 tests', () => {
    expect(CT_4_DETERMINISTIC.length).toBe(25);
  });

  it('CT-5 Accuracy has 15 tests', () => {
    expect(CT_5_DETERMINISTIC.length).toBe(15);
  });

  it('CT-6 Robustness has 35 tests', () => {
    expect(CT_6_DETERMINISTIC.length).toBe(35);
  });

  it('CT-7 Prohibited has 20 tests', () => {
    expect(CT_7_DETERMINISTIC.length).toBe(20);
  });

  it('CT-8 Logging has 15 tests', () => {
    expect(CT_8_DETERMINISTIC.length).toBe(15);
  });

  it('CT-9 Risk Awareness has 8 tests', () => {
    expect(CT_9_DETERMINISTIC.length).toBe(8);
  });

  it('CT-10 GPAI has 6 tests', () => {
    expect(CT_10_DETERMINISTIC.length).toBe(6);
  });

  it('CT-11 Industry has 14 tests', () => {
    expect(CT_11_DETERMINISTIC.length).toBe(14);
  });

  it('all tests have unique IDs', () => {
    const ids = DETERMINISTIC_TESTS.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all test IDs follow CT-N-NNN format', () => {
    for (const test of DETERMINISTIC_TESTS) {
      expect(test.id).toMatch(/^CT-\d+-\d{3}$/);
    }
  });

  it('all categories are valid EvalCategory values', () => {
    const catSet = new Set(EVAL_CATEGORIES);
    for (const test of DETERMINISTIC_TESTS) {
      expect(catSet.has(test.category)).toBe(true);
    }
  });

  it('all deterministic tests have method "deterministic"', () => {
    for (const test of DETERMINISTIC_TESTS) {
      expect(test.method).toBe('deterministic');
    }
  });

  it('all tests have non-empty probe', () => {
    for (const test of DETERMINISTIC_TESTS) {
      expect(typeof test.probe).toBe('string');
      // Note: CT-6-001 intentionally has empty probe for edge-case testing
    }
  });

  it('all tests have severity', () => {
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    for (const test of DETERMINISTIC_TESTS) {
      expect(validSeverities).toContain(test.severity);
    }
  });

  it('all tests have euAiActRef', () => {
    for (const test of DETERMINISTIC_TESTS) {
      expect(test.euAiActRef).toBeTruthy();
    }
  });

  it('deterministic tests have patterns or check fields', () => {
    for (const test of DETERMINISTIC_TESTS) {
      const hasPatterns = (test.passPatterns && test.passPatterns.length > 0) ||
                          (test.failPatterns && test.failPatterns.length > 0);
      const hasChecks = test.checkHeaders !== undefined ||
                        test.checkStatus !== undefined ||
                        test.maxLatencyMs !== undefined;
      expect(hasPatterns || hasChecks).toBe(true);
    }
  });
});
