/**
 * OWASP LLM Top 10 Framework Adapter.
 * Follows the same create*Framework() + score*() pattern as eu-ai-act-framework.ts.
 */

import type { ComplianceFramework, FrameworkCategory, FrameworkCheck, FrameworkScoreResult, FoundationMetrics } from '../../types/framework.types.js';
import { OWASP_LLM_TOP_10 } from '../../data/security/owasp-llm-top10.js';
import { LETTER_GRADE_THRESHOLDS } from '../shared/compliance-constants.js';
import { scorePluginFramework } from './score-plugin-framework.js';

export const createOwaspLlmFramework = (): ComplianceFramework => {
  const categories: FrameworkCategory[] = OWASP_LLM_TOP_10.map((cat) => ({
    id: cat.id,
    name: cat.name,
    weight: 1,
  }));

  const checks: FrameworkCheck[] = OWASP_LLM_TOP_10.flatMap((cat) =>
    cat.plugins.map((plugin, idx) => ({
      id: `${cat.id}-${idx}`,
      name: `${cat.name}: ${plugin}`,
      source: 'scan_check' as const,
      target: plugin,
      categoryId: cat.id,
      weight: 1,
      description: `OWASP ${cat.id} — test plugin: ${plugin}`,
    })),
  );

  return Object.freeze({
    id: 'owasp-llm-top10',
    name: 'OWASP LLM Top 10',
    version: '2025',
    checks,
    categories,
    gradeMapping: Object.freeze({
      type: 'letter' as const,
      thresholds: [...LETTER_GRADE_THRESHOLDS],
    }),
  });
};

/**
 * Score the OWASP LLM Top 10 framework.
 * Key rule: **Critical cap** — if any category has 0 passed checks, overall score ≤ 49.
 */
export const scoreOwaspLlm = (
  fw: ComplianceFramework,
  metrics: FoundationMetrics,
): FrameworkScoreResult =>
  scorePluginFramework(fw, metrics, OWASP_LLM_TOP_10, {
    matchPrefix: (cat) => cat.id.toLowerCase(),
    applyCriticalCap: true,
  });
