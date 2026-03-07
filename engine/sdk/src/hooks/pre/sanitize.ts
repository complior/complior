import type { PreHook } from '../../types.js';
import { PII_PATTERNS } from '../../data/pii/index.js';
import type { PIIPattern } from '../../data/pii/index.js';
import { PIIDetectedError } from '../../errors.js';
import { isLLMMessageArray } from './extract-message-text.js';

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

      mergePIIDetail(details, piiPattern.id, piiPattern.category);

      // Replace the match with redaction label
      const label = `[PII:${piiPattern.label}]`;
      replaced = replaced.slice(0, match.index) + label + replaced.slice(match.index + matchStr.length);

      // Adjust regex lastIndex after replacement
      regex.lastIndex = match.index + label.length;
    }
  }

  return { replaced, details, firstMatch };
};

/** Merge a PII detail into accumulator map (increment count or insert) */
const mergePIIDetail = (target: Map<string, PIIDetail>, id: string, category: string): void => {
  const existing = target.get(id);
  if (existing) {
    target.set(id, { ...existing, count: existing.count + 1 });
  } else {
    target.set(id, { id, category, count: 1 });
  }
};

/** Merge scan details into accumulator */
const accumulateDetails = (
  allDetails: Map<string, PIIDetail>,
  categoriesSet: Set<string>,
  details: Map<string, PIIDetail>,
): number => {
  let count = 0;
  for (const [id, detail] of details) {
    categoriesSet.add(detail.category);
    count += detail.count;
    const existing = allDetails.get(id);
    if (existing) {
      allDetails.set(id, { ...existing, count: existing.count + detail.count });
    } else {
      allDetails.set(id, detail);
    }
  }
  return count;
};

/** GDPR Art.5: PII scrubbing — 50+ PII types with checksum validation and GDPR Art.9 detection */
export const sanitizeHook: PreHook = (ctx) => {
  const val = ctx.params['messages'];
  if (!isLLMMessageArray(val)) return ctx;
  const messages = val;

  const mode = ctx.config.sanitizeMode ?? 'replace';

  // Block mode: throw on first PII match
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

  // Warn + Replace: scan all messages, accumulate details
  const allDetails = new Map<string, PIIDetail>();
  const categoriesSet = new Set<string>();
  let totalRedacted = 0;

  const sanitized = messages.map((m) => {
    if (typeof m.content !== 'string') return m;

    const { replaced, details } = scanContent(m.content, PII_PATTERNS);
    totalRedacted += accumulateDetails(allDetails, categoriesSet, details);

    // Replace mode: return sanitized content; Warn mode: return original
    return mode === 'replace' ? { ...m, content: replaced } : m;
  });

  const metadata = {
    ...ctx.metadata,
    piiRedacted: totalRedacted,
    piiCategories: [...categoriesSet],
    piiDetails: [...allDetails.values()],
  };

  // Warn mode: don't modify params
  if (mode === 'warn') {
    return { ...ctx, metadata };
  }

  // Replace mode: update messages
  return {
    ...ctx,
    params: { ...ctx.params, messages: sanitized },
    metadata,
  };
};
