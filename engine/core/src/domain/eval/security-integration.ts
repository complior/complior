/**
 * Security Integration — bridges AttackProbe → TargetAdapter for eval pipeline.
 *
 * Transforms the existing callLlm-based AttackProbe interface into
 * the eval runner's expected getSecurityProbes() format. The probes
 * are sent to the EXTERNAL target via the adapter, not via internal LLM.
 */

import type { AttackProbe } from '../../data/security/attack-probes.js';
import type { EvalTestSources } from './eval-runner.js';

/** The shape the eval runner expects for security probes. */
export type SecurityProbe = EvalTestSources['getSecurityProbes'] extends () => readonly (infer T)[] ? T : never;

/** OWASP LLM Top 10 category IDs used by attack probes. */
export const OWASP_LLM_CATEGORIES = Object.freeze([
  'LLM01', 'LLM02', 'LLM03', 'LLM04', 'LLM05',
  'LLM06', 'LLM07', 'LLM08', 'LLM09', 'LLM10',
  'ART5',
] as const);

export type OwaspLlmCategory = (typeof OWASP_LLM_CATEGORIES)[number];

/** Map OWASP category to human label. */
export const OWASP_LLM_LABELS: Readonly<Record<OwaspLlmCategory, string>> = Object.freeze({
  LLM01: 'Prompt Injection',
  LLM02: 'Sensitive Information Disclosure',
  LLM03: 'Supply Chain Vulnerabilities',
  LLM04: 'Data and Model Poisoning',
  LLM05: 'Improper Output Handling',
  LLM06: 'Excessive Agency',
  LLM07: 'System Prompt Leakage',
  LLM08: 'Vector and Embedding Weaknesses',
  LLM09: 'Misinformation',
  LLM10: 'Unbounded Consumption',
  ART5: 'Art. 5 Prohibited Practices',
});

/**
 * Convert AttackProbe[] to the eval runner's SecurityProbe[] format.
 *
 * The only transformation is adapting the evaluate function's return type:
 * AttackProbe.evaluate returns EvaluationResult { verdict, confidence, matchedPatterns, reasoning }
 * SecurityProbe.evaluate returns { verdict, confidence, reasoning }
 */
export const adaptProbesForEval = (
  probes: readonly AttackProbe[],
): readonly SecurityProbe[] =>
  probes.map((p): SecurityProbe => Object.freeze({
    id: p.id,
    prompt: p.prompt,
    owaspCategory: p.owaspCategory,
    severity: p.severity,
    evaluate: (response: string) => {
      const result = p.evaluate(response);
      return {
        verdict: result.verdict,
        confidence: result.confidence,
        reasoning: result.reasoning,
      };
    },
  }));

/**
 * Create an EvalTestSources.getSecurityProbes loader from AttackProbe[].
 */
export const createSecurityProbeLoader = (
  probes: readonly AttackProbe[],
): (() => readonly SecurityProbe[]) => {
  let cached: readonly SecurityProbe[] | null = null;
  return () => {
    if (!cached) cached = adaptProbesForEval(probes);
    return cached;
  };
};

/** Count probes per OWASP category from adapted probes. */
export const countByOwaspCategory = (
  probes: readonly SecurityProbe[],
): Readonly<Record<string, number>> => {
  const counts: Record<string, number> = {};
  for (const p of probes) {
    counts[p.owaspCategory] = (counts[p.owaspCategory] ?? 0) + 1;
  }
  return Object.freeze(counts);
};

/** Filter probes by OWASP category. */
export const filterByOwaspCategory = (
  probes: readonly SecurityProbe[],
  category: string,
): readonly SecurityProbe[] => probes.filter((p) => p.owaspCategory === category);

/** Filter probes by severity. */
export const filterBySeverity = (
  probes: readonly SecurityProbe[],
  severity: 'critical' | 'high' | 'medium' | 'low',
): readonly SecurityProbe[] => probes.filter((p) => p.severity === severity);

/**
 * Calculate security score from probe results.
 * Returns 0-100 score with optional per-category breakdown.
 */
export const calculateEvalSecurityScore = (
  results: readonly { verdict: string; owaspCategory?: string }[],
): {
  readonly overall: number;
  readonly byCategory: Readonly<Record<string, { passed: number; total: number; score: number }>>;
} => {
  if (results.length === 0) return { overall: 0, byCategory: {} };

  const byCategory: Record<string, { passed: number; total: number; score: number }> = {};
  let totalPassed = 0;

  for (const r of results) {
    const cat = (r as { owaspCategory?: string }).owaspCategory ?? 'unknown';
    if (!byCategory[cat]) byCategory[cat] = { passed: 0, total: 0, score: 0 };
    byCategory[cat]!.total++;
    if (r.verdict === 'pass') {
      byCategory[cat]!.passed++;
      totalPassed++;
    }
  }

  for (const cat of Object.keys(byCategory)) {
    const c = byCategory[cat]!;
    c.score = Math.round((c.passed / c.total) * 100);
  }

  return Object.freeze({
    overall: Math.round((totalPassed / results.length) * 100),
    byCategory: Object.freeze(byCategory),
  });
};
