import type { PostHook } from '../../types.js';
import { extractResponseText } from './extract-response-text.js';

const ESCALATION_PATTERNS = [
  /speak\s+to\s+a?\s*human/i,
  /human\s+review/i,
  /escalat/i,
  /transfer\s+to\s+agent/i,
  /need\s+a\s+person/i,
];

/** OBL-008: Detect human review requests in response text */
export const escalationHook: PostHook = (ctx, response) => {
  const text = extractResponseText(response);
  const needsEscalation = ESCALATION_PATTERNS.some((p) => p.test(text));

  const headers: Record<string, string> = {};
  if (needsEscalation) headers['X-Human-Review'] = 'requested';

  return {
    response,
    metadata: { ...ctx.metadata, escalationDetected: needsEscalation },
    headers,
  };
};
