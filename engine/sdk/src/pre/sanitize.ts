import type { PreHook } from '../types.js';
import { PII_PATTERNS } from '../data/pii-patterns.js';
import type { PIIPattern } from '../data/pii-patterns.js';
import { PIIDetectedError } from '../errors.js';

interface PIIDetail {
  readonly id: string;
  readonly category: string;
  readonly count: number;
}

const CONTEXT_WINDOW = 200; // chars around match to search for context keywords

const hasContextKeyword = (text: string, matchIndex: number, keywords: readonly string[]): boolean => {
  const start = Math.max(0, matchIndex - CONTEXT_WINDOW);
  const end = Math.min(text.length, matchIndex + CONTEXT_WINDOW);
  const window = text.slice(start, end).toLowerCase();
  return keywords.some((kw) => window.includes(kw.toLowerCase()));
};

const scanContent = (
  content: string,
  patterns: readonly PIIPattern[],
): { replaced: string; details: Map<string, PIIDetail>; firstMatch: { pattern: PIIPattern; match: string } | null } => {
  let replaced = content;
  const details = new Map<string, PIIDetail>();
  let firstMatch: { pattern: PIIPattern; match: string } | null = null;

  for (const piiPattern of patterns) {
    // Reset regex lastIndex for each content scan
    const regex = new RegExp(piiPattern.pattern.source, piiPattern.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(replaced)) !== null) {
      const matchStr = match[0];

      // If pattern has a validator, skip non-valid matches
      if (piiPattern.validator && !piiPattern.validator(matchStr)) {
        continue;
      }

      // If pattern has context keywords, only match if keyword is nearby
      if (piiPattern.contextKeywords && !hasContextKeyword(replaced, match.index, piiPattern.contextKeywords)) {
        continue;
      }

      if (!firstMatch) {
        firstMatch = { pattern: piiPattern, match: matchStr };
      }

      const existing = details.get(piiPattern.id);
      if (existing) {
        details.set(piiPattern.id, { ...existing, count: existing.count + 1 });
      } else {
        details.set(piiPattern.id, { id: piiPattern.id, category: piiPattern.category, count: 1 });
      }

      // Replace the match with redaction label
      const label = `[PII:${piiPattern.label}]`;
      replaced = replaced.slice(0, match.index) + label + replaced.slice(match.index + matchStr.length);

      // Adjust regex lastIndex after replacement
      regex.lastIndex = match.index + label.length;
    }
  }

  return { replaced, details, firstMatch };
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

/** GDPR Art.5: PII scrubbing — 50+ PII types with checksum validation and GDPR Art.9 detection */
export const sanitizeHook: PreHook = (ctx) => {
  const val = ctx.params['messages'];
  if (!isLLMMessageArray(val)) return ctx;
  const messages = val;

  const mode = ctx.config.sanitizeMode ?? 'replace';
  let totalRedacted = 0;
  const allDetails = new Map<string, PIIDetail>();
  const categoriesSet = new Set<string>();

  // In block mode, scan first message to find first match before any replacement
  if (mode === 'block') {
    for (const m of messages) {
      if (typeof m.content !== 'string') continue;
      const { firstMatch } = scanContent(m.content, PII_PATTERNS);
      if (firstMatch) {
        const { pattern } = firstMatch;
        throw new PIIDetectedError(
          `PII detected: ${pattern.description} (${pattern.id}). Blocked by sanitize policy.`,
          pattern.id,
          pattern.category,
          pattern.article ?? 'GDPR Art.6',
        );
      }
    }
    return ctx;
  }

  // warn mode: scan but don't replace
  if (mode === 'warn') {
    for (const m of messages) {
      if (typeof m.content !== 'string') continue;
      const { details } = scanContent(m.content, PII_PATTERNS);
      for (const [id, detail] of details) {
        categoriesSet.add(detail.category);
        totalRedacted += detail.count;
        const existing = allDetails.get(id);
        if (existing) {
          allDetails.set(id, { ...existing, count: existing.count + detail.count });
        } else {
          allDetails.set(id, detail);
        }
      }
    }

    return {
      ...ctx,
      metadata: {
        ...ctx.metadata,
        piiRedacted: totalRedacted,
        piiCategories: [...categoriesSet],
        piiDetails: [...allDetails.values()],
      },
    };
  }

  // replace mode (default): scan and replace
  const sanitized = messages.map((m) => {
    if (typeof m.content !== 'string') return m;

    const { replaced, details } = scanContent(m.content, PII_PATTERNS);

    for (const [id, detail] of details) {
      categoriesSet.add(detail.category);
      totalRedacted += detail.count;
      const existing = allDetails.get(id);
      if (existing) {
        allDetails.set(id, { ...existing, count: existing.count + detail.count });
      } else {
        allDetails.set(id, detail);
      }
    }

    return { ...m, content: replaced };
  });

  return {
    ...ctx,
    params: { ...ctx.params, messages: sanitized },
    metadata: {
      ...ctx.metadata,
      piiRedacted: totalRedacted,
      piiCategories: [...categoriesSet],
      piiDetails: [...allDetails.values()],
    },
  };
};
