/**
 * US-S05-05: Bias Detection Hook — 15 EU Charter Art.21 protected characteristics.
 *
 * Weighted scoring: each matched pattern contributes weight × severity to a total score.
 * Domain-aware: HR, finance, healthcare, education have stricter thresholds and weight overrides.
 * Configurable: biasThreshold (default 0.3), biasAction ('warn' | 'block').
 */
import type { PostHook } from '../../types.js';
import { extractResponseText } from './extract-response-text.js';
import { BIAS_PATTERNS, SEVERITY_WEIGHTS } from '../../data/bias-patterns.js';
import type { BiasPattern } from '../../data/bias-patterns.js';
import { getProfile } from '../../data/bias-profiles.js';
import { BiasDetectedError } from '../../errors.js';
import type { BiasEvidence } from '../../errors.js';

/** EU Charter Art.21 non-discrimination: Bias detection across 15 protected characteristics (Annex III high-risk) */
export const biasCheckHook: PostHook = (ctx, response) => {
  const text = extractResponseText(response);
  if (!text) {
    return {
      response,
      metadata: { ...ctx.metadata, biasCheckPassed: true, biasScore: 0, biasFindings: [] },
      headers: {},
    };
  }

  // Resolve domain profile
  const domainConfig = ctx.config.domain;
  const domainName = typeof domainConfig === 'string' ? domainConfig : undefined;
  const profile = getProfile(domainName);

  // Use config threshold if provided, otherwise profile default
  const threshold = ctx.config.biasThreshold ?? profile.threshold;
  const action = ctx.config.biasAction ?? 'warn';

  // Scan text against all patterns
  const findings: BiasEvidence[] = [];
  let totalScore = 0;

  for (const bp of BIAS_PATTERNS) {
    const match = bp.pattern.exec(text);
    if (!match) continue;

    const weightMultiplier = profile.weightOverrides[bp.characteristic] ?? 1.0;
    const score = bp.weight * weightMultiplier * SEVERITY_WEIGHTS[bp.severity];
    totalScore += score;

    findings.push({
      characteristic: bp.characteristic,
      severity: bp.severity,
      evidence: extractEvidence(text, match, bp),
      score,
    });
  }

  const biasDetected = totalScore >= threshold;
  const headers: Record<string, string> = {};

  if (biasDetected) {
    headers['X-Bias-Warning'] = 'potential-bias-detected';
    headers['X-Bias-Score'] = totalScore.toFixed(3);

    if (action === 'block') {
      throw new BiasDetectedError(
        `Bias detected (score ${totalScore.toFixed(3)} >= threshold ${threshold}): ${findings.map((f) => f.characteristic).join(', ')}`,
        findings,
        totalScore,
        threshold,
        profile.name,
      );
    }
  }

  return {
    response,
    metadata: {
      ...ctx.metadata,
      biasCheckPassed: !biasDetected,
      biasScore: totalScore,
      biasFindings: findings,
      biasThreshold: threshold,
      biasDomain: profile.name,
    },
    headers,
  };
};

const extractEvidence = (text: string, match: RegExpExecArray, bp: BiasPattern): string => {
  // Extract ~80 chars around the match for context
  const start = Math.max(0, match.index - 20);
  const end = Math.min(text.length, match.index + match[0].length + 20);
  const snippet = text.slice(start, end).trim();
  return `[${bp.description}] "...${snippet}..."`;
};
