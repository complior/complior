/**
 * US-S05-17: Safety Filter Hook (OBL-009, Art.15).
 *
 * Stateless PostHook — follows biasCheckHook pattern.
 * Weighted scoring against safety patterns. Modes: block/warn/log.
 */
import type { PostHook } from '../../types.js';
import { extractResponseText } from './extract-response-text.js';
import { SAFETY_PATTERNS, SEVERITY_WEIGHTS } from '../../data/safety-patterns.js';
import { extractEvidenceSnippet } from './extract-evidence-snippet.js';
import { SafetyViolationError } from '../../errors.js';
import type { SafetyFinding } from '../../errors.js';

/** Art.15 Safety Filter: Checks LLM output for harmful content, PII leakage, hallucination indicators */
export const safetyFilterHook: PostHook = (ctx, response) => {
  if (!ctx.config.safetyFilter) {
    return { response, metadata: ctx.metadata, headers: {} };
  }

  const text = extractResponseText(response);
  if (!text) {
    return {
      response,
      metadata: { ...ctx.metadata, safetyPassed: true, safetyScore: 0, safetyFindings: [] },
      headers: {},
    };
  }

  const threshold = ctx.config.safetyThreshold ?? 0.5;
  const mode = ctx.config.safetyMode ?? 'block';

  const findings: SafetyFinding[] = [];
  let totalScore = 0;

  for (const sp of SAFETY_PATTERNS) {
    const match = sp.pattern.exec(text);
    if (!match) continue;

    const score = sp.weight * SEVERITY_WEIGHTS[sp.severity];
    totalScore += score;

    findings.push({
      category: sp.category,
      severity: sp.severity,
      evidence: extractEvidenceSnippet(text, match, sp.description),
      score,
    });
  }

  const violated = totalScore >= threshold;
  const headers: Record<string, string> = {};

  if (violated && mode === 'block') {
    throw new SafetyViolationError(
      `Safety violation (score ${totalScore.toFixed(3)} >= threshold ${threshold}): ${findings.map((f) => f.category).join(', ')}`,
      findings,
      totalScore,
      threshold,
    );
  }

  if (violated && mode === 'warn') {
    headers['X-Safety-Warning'] = 'safety-violation-detected';
    headers['X-Safety-Score'] = totalScore.toFixed(3);
  }

  return {
    response,
    metadata: {
      ...ctx.metadata,
      safetyPassed: !violated,
      safetyScore: totalScore,
      safetyFindings: findings,
      safetyThreshold: threshold,
      safetyMode: mode,
    },
    headers,
  };
};
