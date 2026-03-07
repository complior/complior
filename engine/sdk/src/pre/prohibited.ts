import type { PreHook, MiddlewareContext } from '../types.js';
import { ProhibitedPracticeError } from '../errors.js';
import {
  PROHIBITED_PATTERNS_EN,
  CATEGORY_DESCRIPTIONS,
  ART5_MAX_PENALTY,
  type ProhibitedPattern,
  type Strictness,
} from '../data/prohibited-patterns.js';
import { PROHIBITED_PATTERNS_DE } from '../data/prohibited-i18n/de.js';
import { PROHIBITED_PATTERNS_FR } from '../data/prohibited-i18n/fr.js';
import { PROHIBITED_PATTERNS_NL } from '../data/prohibited-i18n/nl.js';
import { PROHIBITED_PATTERNS_ES } from '../data/prohibited-i18n/es.js';
import { PROHIBITED_PATTERNS_IT } from '../data/prohibited-i18n/it.js';

/** All patterns: EN + DE + FR + NL + ES + IT */
const ALL_PATTERNS: readonly ProhibitedPattern[] = [
  ...PROHIBITED_PATTERNS_EN,
  ...PROHIBITED_PATTERNS_DE,
  ...PROHIBITED_PATTERNS_FR,
  ...PROHIBITED_PATTERNS_NL,
  ...PROHIBITED_PATTERNS_ES,
  ...PROHIBITED_PATTERNS_IT,
];

/**
 * Get patterns filtered by strictness level.
 * - `strict` (default): all patterns including grey-area
 * - `standard`: only clear violations (no grey-area)
 */
const getPatterns = (strictness: Strictness): readonly ProhibitedPattern[] => {
  if (strictness === 'standard') {
    return ALL_PATTERNS.filter((p) => !p.greyArea);
  }
  return ALL_PATTERNS;
};

interface LLMMessage {
  readonly role: string;
  readonly content: string;
}

/** Runtime type guard for LLM messages array (boundary validation) */
const isLLMMessageArray = (val: unknown): val is readonly LLMMessage[] => {
  if (!Array.isArray(val) || val.length === 0) return Array.isArray(val);
  const first: unknown = val[0];
  if (typeof first !== 'object' || first === null) return false;
  return 'role' in first && 'content' in first && typeof first.role === 'string';
};

/** Extract text from messages array */
const extractText = (params: Record<string, unknown>): string => {
  const val = params['messages'];
  if (!isLLMMessageArray(val)) return '';
  return val.map((m) => m.content).join(' ');
};

/** OBL-002: Block prohibited AI practices (Art. 5 EU AI Act, 8 categories) */
export const prohibitedHook: PreHook = (ctx: MiddlewareContext): MiddlewareContext => {
  const text = extractText(ctx.params);
  if (!text) return ctx;

  const strictness: Strictness = ctx.config.strict !== false ? 'strict' : 'standard';
  const patterns = getPatterns(strictness);

  for (const p of patterns) {
    const match = p.pattern.exec(text);
    if (match) {
      const categoryDesc = CATEGORY_DESCRIPTIONS[p.category];
      throw new ProhibitedPracticeError(
        `Prohibited AI practice detected: ${categoryDesc}`,
        p.obligation,
        p.article,
        p.category,
        match[0],
        ART5_MAX_PENALTY,
      );
    }
  }

  // Metadata: flag for downstream Guard API async verification (if opt-in)
  if (ctx.config.guardApi) {
    return {
      ...ctx,
      metadata: {
        ...ctx.metadata,
        guardApiRequested: true,
        guardApiEndpoint: '/guard/prohibited',
      },
    };
  }

  return ctx;
};
