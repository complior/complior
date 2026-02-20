import type { PostHook } from '../types.js';

const ESCALATION_PATTERNS = [
  /speak\s+to\s+a?\s*human/i,
  /human\s+review/i,
  /escalat/i,
  /transfer\s+to\s+agent/i,
  /need\s+a\s+person/i,
];

/** OBL-008: Detect human review requests in response text */
export const escalationHook: PostHook = (ctx, response) => {
  const text = extractText(response);
  const needsEscalation = ESCALATION_PATTERNS.some((p) => p.test(text));

  const headers: Record<string, string> = {};
  if (needsEscalation) headers['X-Human-Review'] = 'requested';

  return {
    response,
    metadata: { ...ctx.metadata, escalationDetected: needsEscalation },
    headers,
  };
};

const extractText = (response: unknown): string => {
  if (typeof response === 'string') return response;
  if (!response || typeof response !== 'object') return '';

  const resp = response as Record<string, unknown>;

  // OpenAI format
  const choices = resp['choices'] as { message?: { content?: string } }[] | undefined;
  if (choices?.[0]?.message?.content) return choices[0].message.content;

  // Anthropic format
  const content = resp['content'] as { text?: string }[] | undefined;
  if (content?.[0]?.text) return content[0].text;

  return '';
};
