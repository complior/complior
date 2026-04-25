/**
 * V1-M26: Map obligation IDs → EU AI Act article references.
 *
 * Background:
 *   User requirement (V1-M21 review):
 *     "Профиль компании выдать с СТАТЬЯМИ И ПОДСТАТЬЯМИ закона EU AI Act"
 *   composition-root.ts previously returned raw OBL-IDs as applicableArticles.
 *   This module converts OBL-IDs to human-readable article references.
 *
 * Architecture:
 *   - Pure function (deterministic)
 *   - Object.freeze on result array
 *   - Data from obligations.json (data externalization, no hardcoded values)
 */

import obligationsData from '../../../data/regulations/eu-ai-act/obligations.json' with { type: 'json' };

export interface ObligationsToArticlesOptions {
  /** Project industry domain. Used to filter sector-specific obligations. */
  domain?: string;
  /**
   * When true, excludes obligations with industry suffixes (FIN/MED/EDU/JUS/MKT/CSR)
   * if the project's domain is 'general'.
   * These sector-specific obligations are not relevant to general-domain projects.
   */
  excludeOtherIndustries?: boolean;
}

/**
 * Convert a list of EU AI Act obligation IDs to their article references.
 *
 * @param obligationIds - List of obligation IDs (e.g. ['eu-ai-act-OBL-001', 'eu-ai-act-OBL-FIN-001'])
 * @param options - Optional domain filter to exclude industry-specific obligations
 * @returns Sorted, deduplicated array of article references (e.g. ['Article 4', 'Article 5'])
 *
 * @example
 * obligationsToArticles(['eu-ai-act-OBL-001'])           // → ['Article 4']
 * obligationsToArticles(['eu-ai-act-OBL-001', 'eu-ai-act-OBL-001A'])  // → ['Article 4'] (deduped)
 * obligationsToArticles([..., 'OBL-FIN-001'], { domain: 'general', excludeOtherIndustries: true }) // FIN excluded
 */
export function obligationsToArticles(
  obligationIds: readonly string[],
  options: ObligationsToArticlesOptions = {},
): readonly string[] {
  const { domain = 'general', excludeOtherIndustries = false } = options;

  const obligations = obligationsData.obligations as ReadonlyArray<{
    obligation_id: string;
    article_reference: string;
    applies_to_role?: string;
  }>;

  // Build a lookup map: obligation_id → article_reference
  // We do this once per call (pure, no mutation)
  const seenArticles = new Set<string>();
  const result: string[] = [];

  for (const obId of obligationIds) {
    // Domain filter: exclude industry-specific obligations for general domain
    if (excludeOtherIndustries && domain === 'general') {
      if (obId.includes('-FIN-') || obId.includes('-MED-') || obId.includes('-EDU-') ||
          obId.includes('-JUS-') || obId.includes('-MKT-') || obId.includes('-CSR-')) {
        // Skip sector-specific obligation — not applicable to general domain
        continue;
      }
    }

    // Look up article reference
    const entry = obligations.find((o) => o.obligation_id === obId);
    if (!entry) {
      // Forward-compat: unknown OBL ID → silently skip
      continue;
    }

    const article = entry.article_reference;
    if (article && !seenArticles.has(article)) {
      seenArticles.add(article);
      result.push(article);
    }
  }

  // Sort ascending by article number
  result.sort((a, b) => {
    const numA = extractArticleNumber(a);
    const numB = extractArticleNumber(b);
    return numA - numB;
  });

  return Object.freeze(result);
}

/**
 * Extract numeric sort key from an article reference string.
 * "Article 4"     → 4
 * "Annex III point 5(b)" → 5 (secondary sort, annex sorts after articles)
 * "Article 10"   → 10
 * "Article 50"   → 50
 */
function extractArticleNumber(ref: string): number {
  // Primary: "Article N"
  const articleMatch = ref.match(/^Article\s+(\d+)/);
  if (articleMatch) {
    return parseInt(articleMatch[1]!, 10);
  }
  // Secondary: "Annex III point N" → sort annexes after articles
  const annexMatch = ref.match(/point\s+(\d+)/);
  if (annexMatch) {
    // Annex numbers start at 1000 to sort after articles (max article is 90)
    return 1000 + parseInt(annexMatch[1]!, 10);
  }
  // Fallback: alphabetic sort
  return 0;
}