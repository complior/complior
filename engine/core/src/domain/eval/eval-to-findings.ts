/**
 * Eval → Findings Bridge — converts eval failures into scanner Finding format
 * for integration with the existing fix pipeline.
 *
 * US-REM-09: Fix Pipeline Integration
 */

import type { EvalResult } from './types.js';
import type { CategoryPlaybook } from './remediation-types.js';
import { CATEGORY_ARTICLES, priorityNum, groupFailuresByCategory, findPlaybook } from './eval-constants.js';
import { isFailedVerdict } from './verdict-utils.js';

// ── Finding type (compatible with scanner Finding) ───────────

export interface EvalFinding {
  readonly checkId: string;
  readonly type: 'A' | 'B';    // A = system prompt patch, B = create file
  readonly layer: string;
  readonly title: string;
  readonly description: string;
  readonly file: string;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly article: string;
  readonly fixDescription: string;
  readonly fixExample: string;
}

// ── Conversion ───────────────────────────────────────────────

/**
 * Convert failed eval results into scanner-compatible findings.
 *
 * Groups failures by category, deduplicates to one finding per category,
 * and assigns fix type based on remediation action type:
 *   - system_prompt → Type A (edit system prompt)
 *   - api_config / infrastructure → Type B (create config file)
 */
export const evalToFindings = (
  result: EvalResult,
  playbooks: readonly CategoryPlaybook[],
): readonly EvalFinding[] => {
  const failures = result.results.filter(isFailedVerdict);

  // Group by category (one finding per category, not per test)
  const byCat = groupFailuresByCategory(failures);

  const findings: EvalFinding[] = [];

  for (const [cat, catFailures] of byCat) {
    const pb = findPlaybook(playbooks, cat);
    if (!pb) continue;

    // Find the highest-priority action
    const topAction = [...pb.actions]
      .sort((a, b) => priorityNum(a.priority) - priorityNum(b.priority))[0];
    if (!topAction) continue;

    const article = CATEGORY_ARTICLES[cat] ?? pb.article_ref;
    const isSystemPrompt = topAction.type === 'system_prompt';
    const severity = catFailures.some((f) => f.severity === 'critical') ? 'critical'
      : catFailures.some((f) => f.severity === 'high') ? 'high'
      : catFailures.some((f) => f.severity === 'medium') ? 'medium'
      : 'low';

    findings.push({
      checkId: `eval-${cat}`,
      type: isSystemPrompt ? 'A' : 'B',
      layer: 'eval',
      title: `${pb.label}: ${catFailures.length} eval failures`,
      description: `${catFailures.length} tests failed in ${pb.label} (${article}). ${topAction.description}`,
      file: isSystemPrompt ? 'system-prompt' : `.complior/eval-fixes/${cat}-config.json`,
      severity,
      article,
      fixDescription: topAction.user_guidance.what_to_do.join('. '),
      fixExample: topAction.example,
    });
  }

  // Sort by severity
  findings.sort((a, b) => priorityNum(a.severity) - priorityNum(b.severity));

  return Object.freeze(findings);
};
