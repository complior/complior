/**
 * Barrel export for all conformity tests.
 */

import type { ConformityTest } from '../../domain/eval/types.js';
import { CT_1_DETERMINISTIC } from './ct-1-transparency.js';
import { CT_2_DETERMINISTIC } from './ct-2-oversight.js';
import { CT_3_DETERMINISTIC } from './ct-3-explanation.js';
import { CT_4_DETERMINISTIC } from './ct-4-bias.js';
import { CT_5_DETERMINISTIC } from './ct-5-accuracy.js';
import { CT_6_DETERMINISTIC } from './ct-6-robustness.js';
import { CT_7_DETERMINISTIC } from './ct-7-prohibited.js';
import { CT_8_DETERMINISTIC } from './ct-8-logging.js';
import { CT_9_DETERMINISTIC } from './ct-9-risk-awareness.js';
import { CT_10_DETERMINISTIC } from './ct-10-gpai.js';
import { CT_11_DETERMINISTIC } from './ct-11-industry.js';

/** All deterministic conformity tests (158 total). */
export const DETERMINISTIC_TESTS: readonly ConformityTest[] = Object.freeze([
  ...CT_1_DETERMINISTIC,
  ...CT_2_DETERMINISTIC,
  ...CT_3_DETERMINISTIC,
  ...CT_4_DETERMINISTIC,
  ...CT_5_DETERMINISTIC,
  ...CT_6_DETERMINISTIC,
  ...CT_7_DETERMINISTIC,
  ...CT_8_DETERMINISTIC,
  ...CT_9_DETERMINISTIC,
  ...CT_10_DETERMINISTIC,
  ...CT_11_DETERMINISTIC,
]);

/** LLM-judged tests (added in Batch 6). */
export let LLM_JUDGED_TESTS: readonly ConformityTest[] = Object.freeze([]);

/** Register LLM-judged tests (called from Batch 6 modules). */
export const registerLlmTests = (tests: readonly ConformityTest[]): void => {
  LLM_JUDGED_TESTS = Object.freeze([...LLM_JUDGED_TESTS, ...tests]);
};

/** All conformity tests (deterministic + LLM-judged). */
export const getAllTests = (): readonly ConformityTest[] =>
  Object.freeze([...DETERMINISTIC_TESTS, ...LLM_JUDGED_TESTS]);

// Re-exports
export { CT_1_DETERMINISTIC } from './ct-1-transparency.js';
export { CT_2_DETERMINISTIC } from './ct-2-oversight.js';
export { CT_3_DETERMINISTIC } from './ct-3-explanation.js';
export { CT_4_DETERMINISTIC } from './ct-4-bias.js';
export { CT_5_DETERMINISTIC } from './ct-5-accuracy.js';
export { CT_6_DETERMINISTIC } from './ct-6-robustness.js';
export { CT_7_DETERMINISTIC } from './ct-7-prohibited.js';
export { CT_8_DETERMINISTIC } from './ct-8-logging.js';
export { CT_9_DETERMINISTIC } from './ct-9-risk-awareness.js';
export { CT_10_DETERMINISTIC } from './ct-10-gpai.js';
export { CT_11_DETERMINISTIC } from './ct-11-industry.js';
