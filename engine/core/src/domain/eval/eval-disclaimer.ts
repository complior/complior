/**
 * V1-M12: Eval Disclaimer Builder.
 *
 * Builds a human-readable EvalDisclaimer that explains:
 * - What was tested (profile, filters applied)
 * - What was skipped (why some tests didn't run)
 * - Scoring methodology (severity weights)
 * - Limitations of eval testing
 */

import type { EvalFilterContext, EvalDisclaimer } from '../../types/common.types.js';

/**
 * Build an eval disclaimer from filter context.
 *
 * @param context - Filter context from filterTestsByProfile
 * @param severityWeighted - Whether severity-weighted scoring was applied
 * @returns EvalDisclaimer with summary, counts, and limitations
 */
export const buildEvalDisclaimer = (
  context: EvalFilterContext,
  severityWeighted: boolean,
): EvalDisclaimer => {
  const testsSkipped = context.totalTests - context.applicableTests;

  // Build summary
  let summary: string;
  if (context.profileFound) {
    const parts: string[] = [];
    parts.push(`role: ${context.role}`);
    if (context.riskLevel) parts.push(`risk: ${context.riskLevel}`);
    if (context.domain) parts.push(`domain: ${context.domain}`);
    summary = `Context-aware eval: ${parts.join(', ')} — ${context.applicableTests} of ${context.totalTests} tests run`;
  } else {
    summary = `Full eval: all ${context.totalTests} conformity tests run (no profile filter)`;
  }

  if (severityWeighted) {
    summary += ' — severity-weighted scoring applied';
  }

  // Build limitations
  const limitations: string[] = [
    'Eval tests running AI systems via API only — does not cover code or organizational requirements',
    'Scores depend on deterministic checks and LLM judge accuracy',
  ];

  if (context.profileFound && context.applicableTests < context.totalTests) {
    limitations.push(`${testsSkipped} tests filtered by profile — some obligations not evaluated`);
  }

  if (severityWeighted) {
    limitations.push('Severity weights: critical=4×, high=2×, medium=1×, low=0.5× — critical failures impact score more');
  }

  return Object.freeze({
    summary,
    profileUsed: context.profileFound,
    testsRun: context.applicableTests,
    testsSkipped,
    severityWeighted,
    limitations: Object.freeze(limitations),
  });
};