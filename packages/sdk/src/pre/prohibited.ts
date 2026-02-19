import type { PreHook } from '../types.js';
import { ProhibitedPracticeError } from '../errors.js';

const PROHIBITED_PATTERNS = [
  { pattern: /emotion\s*recognition/i, obligation: 'OBL-002', article: 'Art. 5(1)(f)' },
  { pattern: /social\s*scoring/i, obligation: 'OBL-002', article: 'Art. 5(1)(c)' },
  { pattern: /biometric\s*categorisation/i, obligation: 'OBL-002', article: 'Art. 5(1)(g)' },
  { pattern: /subliminal\s*manipulation/i, obligation: 'OBL-002', article: 'Art. 5(1)(a)' },
  { pattern: /predictive\s*policing/i, obligation: 'OBL-002', article: 'Art. 5(1)(d)' },
];

/** OBL-002: Block prohibited AI practices */
export const prohibitedHook: PreHook = (ctx) => {
  const messages = ctx.params['messages'] as { role: string; content: string }[] | undefined;
  if (!messages) return ctx;

  const text = messages.map((m) => m.content).join(' ');

  for (const { pattern, obligation, article } of PROHIBITED_PATTERNS) {
    if (pattern.test(text)) {
      throw new ProhibitedPracticeError(
        `Prohibited AI practice detected: ${pattern.source}`,
        obligation,
        article,
      );
    }
  }

  return ctx;
};
