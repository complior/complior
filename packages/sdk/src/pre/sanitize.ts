import type { PreHook } from '../types.js';

const PII_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN-REDACTED]' },
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: '[EMAIL-REDACTED]' },
  { pattern: /\b\d{16}\b/g, replacement: '[CC-REDACTED]' },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '[CC-REDACTED]' },
];

/** GDPR Art.5: PII scrubbing */
export const sanitizeHook: PreHook = (ctx) => {
  const messages = ctx.params['messages'] as { role: string; content: string }[] | undefined;
  if (!messages) return ctx;

  let redactedCount = 0;

  const sanitized = messages.map((m) => {
    let content = m.content;
    for (const { pattern, replacement } of PII_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) redactedCount += matches.length;
      content = content.replace(pattern, replacement);
    }
    return { ...m, content };
  });

  return {
    ...ctx,
    params: { ...ctx.params, messages: sanitized },
    metadata: { ...ctx.metadata, piiRedacted: redactedCount },
  };
};
