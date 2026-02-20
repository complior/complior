import type { PostHook } from '../types.js';

const BIAS_PATTERNS = [
  /\b(always|never)\b.*\b(men|women|male|female)\b/i,
  /\b(all|every)\b.*\b(race|ethnic|nationality)\b/i,
  /\b(inherently|naturally)\b.*\b(superior|inferior)\b/i,
];

/** OBL-004a: Basic bias pattern detection in response */
export const biasCheckHook: PostHook = (ctx, response) => {
  const text = extractResponseText(response);
  const biasDetected = BIAS_PATTERNS.some((p) => p.test(text));

  const headers: Record<string, string> = {};
  if (biasDetected) headers['X-Bias-Warning'] = 'potential-bias-detected';

  return {
    response,
    metadata: { ...ctx.metadata, biasCheckPassed: !biasDetected },
    headers,
  };
};

const extractResponseText = (response: unknown): string => {
  if (typeof response === 'string') return response;
  if (!response || typeof response !== 'object') return '';

  const resp = response as Record<string, unknown>;

  const choices = resp['choices'] as { message?: { content?: string } }[] | undefined;
  if (choices?.[0]?.message?.content) return choices[0].message.content;

  const content = resp['content'] as { text?: string }[] | undefined;
  if (content?.[0]?.text) return content[0].text;

  return '';
};
