export interface SectionDepth {
  readonly wordCount: number;
  readonly sentenceCount: number;
  readonly hasLists: boolean;
  readonly hasTables: boolean;
  readonly hasSpecifics: boolean;
  readonly isShallow: boolean;
}

const HEADING_REGEX = /^#{1,4}\s+(.+)$/gm;

export const parseMarkdownHeadings = (content: string): readonly string[] => {
  const headings: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = HEADING_REGEX.exec(content)) !== null) {
    headings.push(match[1].trim());
  }
  return headings;
};

export const normalize = (text: string): string =>
  text.toLowerCase().replace(/[\s_-]+/g, ' ').trim();

export const headingMatches = (heading: string, sectionTitle: string): boolean =>
  normalize(heading).includes(normalize(sectionTitle));

const LIST_REGEX = /^[\s]*[-*•]\s+|^\s*\d+\.\s+/m;
const TABLE_REGEX = /\|.*\|.*\|/;
const SPECIFICS_REGEX = /\b\d{4}[-/]\d{2}[-/]\d{2}\b|\b\d+%|\b\d+\.\d+\b|€|Art\.\s*\d+/;

export const extractSectionContents = (content: string): ReadonlyMap<string, string> => {
  const sections = new Map<string, string>();
  const lines = content.split('\n');
  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = /^#{1,4}\s+(.+)$/.exec(line);
    if (headingMatch) {
      if (currentHeading !== null) {
        sections.set(currentHeading, currentContent.join('\n'));
      }
      currentHeading = headingMatch[1].trim();
      currentContent = [];
    } else if (currentHeading !== null) {
      currentContent.push(line);
    }
  }

  if (currentHeading !== null) {
    sections.set(currentHeading, currentContent.join('\n'));
  }

  return sections;
};

// --- Semantic Depth (E-12 enhancement) ---

export interface SemanticDepth extends SectionDepth {
  readonly hasNumericMetrics: boolean;     // percentages, counts, thresholds
  readonly hasLegalReferences: boolean;    // "Art. X", "GDPR", "ISO"
  readonly hasDateReferences: boolean;     // dates, deadlines, "annually"
  readonly hasActionItems: boolean;        // "must", "shall", "required to"
  readonly hasMeasurableTargets: boolean;  // "99.9%", ">95%", "within 24 hours"
  readonly placeholderCount: number;       // [TODO], [Name], [Company] etc.
  readonly qualityScore: number;           // 0-100 per section
  readonly feedback: string;              // actionable recommendation
}

const NUMERIC_METRICS_REGEX = /\b\d+(\.\d+)?%|\b\d+(\.\d+)?\s*(ms|seconds?|minutes?|hours?|days?|requests?|errors?|users?)|\b[<>≥≤]=?\s*\d+/;
const LEGAL_REF_REGEX = /\bArt\.\s*\d+|\bGDPR\b|\bISO\s*\d+|\bNIST\b|\bAIUC|EU\s*AI\s*Act|Regulation\s*\(EU\)/i;
const DATE_REF_REGEX = /\b\d{4}[-/]\d{2}[-/]\d{2}\b|\b(annually|quarterly|monthly|weekly|bi-annual|semi-annual)\b|\b(Q[1-4]\s*20\d{2}|H[12]\s*20\d{2})\b/i;
const ACTION_REGEX = /\b(must|shall|required to|obliged to|needs? to|will implement|will ensure)\b/i;
const MEASURABLE_REGEX = /\b\d+(\.\d+)?%|\bwithin\s+\d+\s*(hours?|days?|minutes?)|\b(SLA|KPI|SLO|threshold|target|benchmark)\b/i;

/**
 * Detect bracketed placeholder patterns like [Name], [TODO: ...], [Company Name].
 * Excludes markdown links [text](url) via negative lookahead, and checkboxes [x]/[ ] via min length.
 */
const PLACEHOLDER_BRACKET_REGEX = /\[[^\]]{2,60}\](?!\()/g;

export const measureSemanticDepth = (content: string, sectionTitle: string): SemanticDepth => {
  const base = measureSectionDepth(content);
  const trimmed = content.trim();

  const hasNumericMetrics = NUMERIC_METRICS_REGEX.test(trimmed);
  const hasLegalReferences = LEGAL_REF_REGEX.test(trimmed);
  const hasDateReferences = DATE_REF_REGEX.test(trimmed);
  const hasActionItems = ACTION_REGEX.test(trimmed);
  const hasMeasurableTargets = MEASURABLE_REGEX.test(trimmed);

  // Placeholder detection: [Name], [TODO: Company], [H/M/L/N], etc.
  const placeholderMatches = trimmed.match(PLACEHOLDER_BRACKET_REGEX) ?? [];
  const placeholderCount = placeholderMatches.filter(m =>
    !/^\[[ xX]\]$/.test(m) &&  // not checkbox
    !/^\[!\w/.test(m),          // not image alt start
  ).length;

  // Quality score: weighted sum of semantic signals
  let qualityScore = 0;
  if (base.wordCount >= 50) qualityScore += 20;
  else if (base.wordCount >= 20) qualityScore += 10;
  if (base.hasLists) qualityScore += 10;
  if (base.hasTables) qualityScore += 10;
  if (base.hasSpecifics) qualityScore += 10;
  if (hasNumericMetrics) qualityScore += 15;
  if (hasLegalReferences) qualityScore += 10;
  if (hasDateReferences) qualityScore += 5;
  if (hasActionItems) qualityScore += 10;
  if (hasMeasurableTargets) qualityScore += 10;

  // Placeholder penalty: scaffold documents have many [TODO], [Name], etc.
  if (placeholderCount > 0) {
    qualityScore -= placeholderCount * 10;
    if (placeholderCount >= 3) qualityScore -= 20; // heavy scaffold penalty
  }
  qualityScore = Math.max(0, qualityScore);

  // Generate feedback
  const suggestions: string[] = [];
  if (placeholderCount > 0) suggestions.push(`Fill ${placeholderCount} placeholder(s) — replace [bracketed] fields with actual data`);
  if (!hasNumericMetrics) suggestions.push('Add numeric metrics (accuracy %, response time, thresholds)');
  if (!hasLegalReferences) suggestions.push('Add legal references (Art. numbers, standards)');
  if (!hasDateReferences) suggestions.push('Add timeline (dates, review frequency)');
  if (!hasMeasurableTargets) suggestions.push('Add measurable targets (KPIs, SLAs)');
  if (base.wordCount < 50) suggestions.push(`Expand content (currently ${base.wordCount} words, minimum 50 recommended)`);
  if (!base.hasLists && !base.hasTables) suggestions.push('Add structured content (lists or tables)');

  const feedback = suggestions.length > 0
    ? `Section "${sectionTitle}": ${suggestions.join('; ')}`
    : `Section "${sectionTitle}": adequate`;

  // Override isShallow based on semantic quality
  const isShallow = qualityScore < 30;

  return {
    ...base,
    isShallow,
    hasNumericMetrics,
    hasLegalReferences,
    hasDateReferences,
    hasActionItems,
    hasMeasurableTargets,
    placeholderCount,
    qualityScore,
    feedback,
  };
};

export const measureSectionDepth = (content: string): SectionDepth => {
  const trimmed = content.trim();
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const hasLists = LIST_REGEX.test(trimmed);
  const hasTables = TABLE_REGEX.test(trimmed);
  const hasSpecifics = SPECIFICS_REGEX.test(trimmed);

  const isShallow = words.length < 50 && !hasLists && !hasTables && !hasSpecifics;

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    hasLists,
    hasTables,
    hasSpecifics,
    isShallow,
  };
};
