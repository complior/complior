import type { CheckResult } from '../../../types/common.types.js';
import type { DocQualityLevel } from '../../../types/passport.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';
import { DOCUMENT_VALIDATORS } from '../validators.js';
import {
  parseMarkdownHeadings,
  headingMatches,
  extractSectionContents,
  extractGroupedSectionContent,
  measureSemanticDepth,
  hasAiReviewMarker,
} from './layer2-parsing.js';

// Re-export for backward compatibility
export { measureSectionDepth, measureSemanticDepth } from './layer2-parsing.js';
export type { SectionDepth, SemanticDepth } from './layer2-parsing.js';

// --- Types ---

export interface ValidatorSection {
  readonly title: string;
  readonly required: boolean;
}

export interface DocumentValidator {
  readonly document: string;
  readonly obligation: string;
  readonly article: string;
  readonly file_patterns: readonly string[];
  readonly required_sections: readonly ValidatorSection[];
}

export type L2Status = 'VALID' | 'PARTIAL' | 'SHALLOW' | 'EMPTY';

export interface L2CheckResult {
  readonly obligationId: string;
  readonly article: string;
  readonly document: string;
  readonly status: L2Status;
  readonly foundSections: readonly string[];
  readonly missingSections: readonly string[];
  readonly totalRequired: number;
  readonly matchedRequired: number;
  readonly shallowSections?: readonly string[];
  readonly sectionFeedback?: readonly string[];     // per-section actionable feedback
  readonly completenessScore?: number;              // 0-100 overall document quality
  readonly docQuality: DocQualityLevel;
}

// --- Validator Loading ---

export const loadValidators = (): readonly DocumentValidator[] => DOCUMENT_VALIDATORS;

/** Marker injected by Complior fix into auto-generated scaffold files. */
const SCAFFOLD_MARKER = '<!-- COMPLIOR:SCAFFOLD -->';
const hasScaffoldMarker = (content: string): boolean => content.includes(SCAFFOLD_MARKER);

/** Derive doc quality from L2 status + AI review marker presence + scaffold marker. */
const classifyDocQuality = (status: L2Status, content: string): DocQualityLevel =>
  hasAiReviewMarker(content)
    ? 'reviewed'
    : hasScaffoldMarker(content)
      ? 'scaffold'
      : (status === 'SHALLOW' || status === 'EMPTY' || status === 'PARTIAL') ? 'scaffold' : 'draft';

// --- L2 Check Logic ---

const findMatchingFile = (
  validator: DocumentValidator,
  files: readonly { readonly relativePath: string; readonly content: string }[],
): { readonly relativePath: string; readonly content: string } | undefined => {
  for (const file of files) {
    const filename = file.relativePath.split('/').pop() ?? '';
    for (const pattern of validator.file_patterns) {
      if (filename.toLowerCase() === pattern.toLowerCase()) {
        return file;
      }
    }
  }
  return undefined;
};

export const validateDocument = (
  validator: DocumentValidator,
  content: string,
): L2CheckResult => {
  const obligationId = validator.obligation;
  const headings = parseMarkdownHeadings(content);
  const requiredSections = validator.required_sections.filter((s) => s.required);

  if (content.trim().length === 0 || headings.length === 0) {
    return {
      obligationId,
      article: validator.article,
      document: validator.document,
      status: 'EMPTY',
      foundSections: [],
      missingSections: requiredSections.map((s) => s.title),
      totalRequired: requiredSections.length,
      matchedRequired: 0,
      docQuality: classifyDocQuality('EMPTY', content),
    };
  }

  const found: string[] = [];
  const missing: string[] = [];

  for (const section of requiredSections) {
    const matched = headings.some((h) => headingMatches(h, section.title));
    if (matched) {
      found.push(section.title);
    } else {
      missing.push(section.title);
    }
  }

  // If all headings present, check content depth for SHALLOW detection
  if (missing.length === 0 && found.length > 0) {
    const sectionContents = extractSectionContents(content);
    const shallowSections: string[] = [];
    const feedbackItems: string[] = [];
    let totalQualityScore = 0;
    let scoredSections = 0;

    for (const sectionTitle of found) {
      // Find matching heading in extracted contents
      const matchedHeading = [...sectionContents.keys()].find((h) =>
        headingMatches(h, sectionTitle),
      );
      if (matchedHeading !== undefined) {
        // Use grouped extraction to include child sub-headings (### under ##)
        const sectionContent = extractGroupedSectionContent(content, sectionTitle);
        const semantic = measureSemanticDepth(sectionContent, sectionTitle);
        if (semantic.isShallow) {
          shallowSections.push(sectionTitle);
        }
        if (semantic.feedback && !semantic.feedback.endsWith(': adequate')) {
          feedbackItems.push(semantic.feedback);
        }
        totalQualityScore += semantic.qualityScore;
        scoredSections++;
      }
    }

    const shallowRatio = found.length > 0 ? shallowSections.length / found.length : 0;
    const completenessScore = scoredSections > 0
      ? Math.round(totalQualityScore / scoredSections)
      : 0;
    const status: L2Status = shallowRatio > 0.5
      ? 'SHALLOW'
      : completenessScore < 50
        ? 'PARTIAL'
        : 'VALID';

    const docQuality = classifyDocQuality(status, content);

    return {
      obligationId,
      article: validator.article,
      document: validator.document,
      status,
      foundSections: found,
      missingSections: missing,
      totalRequired: requiredSections.length,
      matchedRequired: found.length,
      shallowSections: shallowSections.length > 0 ? shallowSections : undefined,
      sectionFeedback: feedbackItems.length > 0 ? feedbackItems : undefined,
      completenessScore,
      docQuality,
    };
  }

  const status: L2Status = missing.length === 0
    ? 'VALID'
    : found.length === 0
      ? 'EMPTY'
      : 'PARTIAL';

  const docQuality = classifyDocQuality(status, content);

  return {
    obligationId,
    article: validator.article,
    document: validator.document,
    status,
    foundSections: found,
    missingSections: missing,
    totalRequired: requiredSections.length,
    matchedRequired: found.length,
    docQuality,
  };
};

// --- Scanner Integration ---

export const runLayer2 = (ctx: ScanContext): readonly L2CheckResult[] => {
  const validators = loadValidators();
  const results: L2CheckResult[] = [];

  for (const validator of validators) {
    const file = findMatchingFile(validator, ctx.files);
    if (file === undefined) continue; // L1 didn't find it — L2 skips

    results.push(validateDocument(validator, file.content));
  }

  return results;
};

export const layer2ToCheckResults = (l2Results: readonly L2CheckResult[]): readonly CheckResult[] => {
  return l2Results.map((r): CheckResult => {
    if (r.status === 'VALID') {
      return {
        type: 'pass',
        checkId: `l2-${r.document}`,
        message: `${r.article}: ${r.document} — all ${r.totalRequired} required sections present`,
      };
    }

    if (r.status === 'SHALLOW') {
      const shallowList = r.shallowSections?.join(', ') ?? 'multiple sections';
      const feedbackSuffix = r.sectionFeedback && r.sectionFeedback.length > 0
        ? `. Suggestions: ${r.sectionFeedback.join('. ')}`
        : '';
      const scoreSuffix = r.completenessScore !== undefined
        ? ` (quality: ${r.completenessScore}/100)`
        : '';
      return {
        type: 'fail',
        checkId: `l2-${r.document}`,
        message: `${r.article}: ${r.document} — headings present but content is shallow in: ${shallowList}${scoreSuffix}`,
        severity: 'medium',
        obligationId: r.obligationId,
        articleReference: r.article,
        fix: `Expand shallow sections in ${r.document} with details (dates, specifics, lists): ${shallowList}${feedbackSuffix}`,
      };
    }

    if (r.status === 'PARTIAL') {
      // Two PARTIAL triggers: missing sections OR low content quality
      if (r.missingSections.length > 0) {
        return {
          type: 'fail',
          checkId: `l2-${r.document}`,
          message: `${r.article}: ${r.document} — missing sections: ${r.missingSections.join(', ')} (${r.matchedRequired}/${r.totalRequired})`,
          severity: 'medium',
          obligationId: r.obligationId,
          articleReference: r.article,
          fix: `Add missing sections to ${r.document}: ${r.missingSections.join(', ')}`,
        };
      }
      // All headings present but content quality < 50
      const scoreSuffix = r.completenessScore !== undefined
        ? ` (quality: ${r.completenessScore}/100)`
        : '';
      const feedbackSuffix = r.sectionFeedback && r.sectionFeedback.length > 0
        ? `. Suggestions: ${r.sectionFeedback.join('. ')}`
        : '';
      const scaffoldHint = r.docQuality === 'scaffold'
        ? '. Remove <!-- COMPLIOR:SCAFFOLD --> comment after editing to upgrade to draft quality'
        : '';
      return {
        type: 'fail',
        checkId: `l2-${r.document}`,
        message: `${r.article}: ${r.document} — all sections present but content needs enrichment${scoreSuffix}`,
        severity: 'low',
        obligationId: r.obligationId,
        articleReference: r.article,
        fix: `Enrich content in ${r.document} — add specifics, dates, tables${feedbackSuffix}${scaffoldHint}`,
      };
    }

    // EMPTY
    return {
      type: 'fail',
      checkId: `l2-${r.document}`,
      message: `${r.article}: ${r.document} — document is empty or has no headings (0/${r.totalRequired} required sections)`,
      severity: 'high',
      obligationId: r.obligationId,
      articleReference: r.article,
      fix: `Populate ${r.document} with required sections: ${r.missingSections.join(', ')}`,
    };
  });
};
