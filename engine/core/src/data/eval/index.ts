/**
 * Barrel export for all conformity tests (380 total = 168 deterministic + 212 LLM-judged).
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
import { ALL_LLM_JUDGED_TESTS } from './llm-judged-tests.js';

/** All deterministic conformity tests (176 total). */
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

/** All LLM-judged conformity tests (212 total). */
export const LLM_JUDGED_TESTS: readonly ConformityTest[] = ALL_LLM_JUDGED_TESTS;

/** All conformity tests (388 total). */
export const ALL_CONFORMITY_TESTS: readonly ConformityTest[] = Object.freeze([
  ...DETERMINISTIC_TESTS,
  ...LLM_JUDGED_TESTS,
]);

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
export { ALL_LLM_JUDGED_TESTS } from './llm-judged-tests.js';
