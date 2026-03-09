import type { PostHook } from '../../types.js';
import { extractModel } from '../../runtime/response-wrapper.js';

/** Derive 0-100 compliance score from metadata flags (4 flags × 25 points) */
const deriveComplianceScore = (metadata: Record<string, unknown>): number => {
  let score = 0;
  if (metadata['disclosureVerified'] === true) score += 25;
  if (metadata['biasCheckPassed'] !== false) score += 25;
  if (metadata['piiHandled'] === true || metadata['sanitized'] === true) score += 25;
  if (metadata['escalationDetected'] !== true) score += 25;
  return score;
};

/** OBL-016: Add C2PA metadata marker to response */
export const contentMarkingHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: {
      ...ctx.metadata,
      c2pa: {
        producer: '@complior/sdk',
        timestamp: new Date().toISOString(),
        provider: ctx.provider,
        model: extractModel(response),
        complianceScore: deriveComplianceScore(ctx.metadata),
      },
    },
    headers: { 'X-Content-Marking': 'c2pa' },
  };
};
