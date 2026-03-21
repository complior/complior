import { describe, it, expect } from 'vitest';
import { ALL_CONFORMITY_TESTS, DETERMINISTIC_TESTS, LLM_JUDGED_TESTS } from './index.js';
import { EVAL_CATEGORIES } from '../../domain/eval/types.js';
import {
  CT_1_LLM, CT_2_LLM, CT_3_LLM, CT_4_LLM, CT_5_LLM,
  CT_7_LLM, CT_9_LLM, CT_10_LLM, CT_11_LLM,
} from './llm-judged-tests.js';

describe('LLM-Judged Conformity Tests', () => {
  it('has 212 LLM-judged tests', () => {
    expect(LLM_JUDGED_TESTS.length).toBe(212);
  });

  it('CT-1 LLM has 35 tests', () => { expect(CT_1_LLM.length).toBe(35); });
  it('CT-2 LLM has 20 tests', () => { expect(CT_2_LLM.length).toBe(20); });
  it('CT-3 LLM has 30 tests', () => { expect(CT_3_LLM.length).toBe(30); });
  it('CT-4 LLM has 50 tests', () => { expect(CT_4_LLM.length).toBe(50); });
  it('CT-5 LLM has 15 tests', () => { expect(CT_5_LLM.length).toBe(15); });
  it('CT-7 LLM has 25 tests', () => { expect(CT_7_LLM.length).toBe(25); });
  it('CT-9 LLM has 10 tests', () => { expect(CT_9_LLM.length).toBe(10); });
  it('CT-10 LLM has 6 tests', () => { expect(CT_10_LLM.length).toBe(6); });
  it('CT-11 LLM has 21 tests', () => { expect(CT_11_LLM.length).toBe(21); });

  it('CT-6 and CT-8 have 0 LLM tests (all deterministic)', () => {
    const ct6Llm = LLM_JUDGED_TESTS.filter((t) => t.category === 'robustness');
    const ct8Llm = LLM_JUDGED_TESTS.filter((t) => t.category === 'logging');
    expect(ct6Llm.length).toBe(0);
    expect(ct8Llm.length).toBe(0);
  });
});

describe('All Conformity Tests Combined', () => {
  it('has 370 total tests (158 deterministic + 212 LLM)', () => {
    expect(ALL_CONFORMITY_TESTS.length).toBe(370);
    expect(DETERMINISTIC_TESTS.length + LLM_JUDGED_TESTS.length).toBe(370);
  });

  it('all tests have unique IDs', () => {
    const ids = ALL_CONFORMITY_TESTS.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all LLM tests have method "llm-judge"', () => {
    for (const test of LLM_JUDGED_TESTS) {
      expect(test.method).toBe('llm-judge');
    }
  });

  it('all LLM tests have judgePrompt', () => {
    for (const test of LLM_JUDGED_TESTS) {
      expect(test.judgePrompt).toBeTruthy();
      expect(typeof test.judgePrompt).toBe('string');
      expect(test.judgePrompt!.length).toBeGreaterThan(10);
    }
  });

  it('all LLM tests have scale', () => {
    for (const test of LLM_JUDGED_TESTS) {
      expect(['binary', '1-5']).toContain(test.scale);
    }
  });

  it('all LLM tests have passThreshold', () => {
    for (const test of LLM_JUDGED_TESTS) {
      expect(test.passThreshold).toBeDefined();
      expect(test.passThreshold).toBeGreaterThanOrEqual(1);
    }
  });

  it('all categories are valid', () => {
    const catSet = new Set(EVAL_CATEGORIES);
    for (const test of ALL_CONFORMITY_TESTS) {
      expect(catSet.has(test.category)).toBe(true);
    }
  });

  it('all test IDs follow CT-N-NNN format', () => {
    for (const test of ALL_CONFORMITY_TESTS) {
      expect(test.id).toMatch(/^CT-\d+-\d{3}$/);
    }
  });
});
