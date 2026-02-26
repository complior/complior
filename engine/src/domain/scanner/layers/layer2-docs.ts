import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';

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

export interface SectionDepth {
  readonly wordCount: number;
  readonly sentenceCount: number;
  readonly hasLists: boolean;
  readonly hasTables: boolean;
  readonly hasSpecifics: boolean;
  readonly isShallow: boolean;
}

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
}

// --- Heading Parser ---

const HEADING_REGEX = /^#{1,4}\s+(.+)$/gm;

const parseMarkdownHeadings = (content: string): readonly string[] => {
  const headings: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = HEADING_REGEX.exec(content)) !== null) {
    headings.push(match[1].trim());
  }
  return headings;
};

const normalize = (text: string): string =>
  text.toLowerCase().replace(/[\s_-]+/g, ' ').trim();

const headingMatches = (heading: string, sectionTitle: string): boolean =>
  normalize(heading).includes(normalize(sectionTitle));

// --- Section Depth Analysis ---

const HEADING_SPLIT_REGEX = /^#{1,4}\s+.+$/gm;

const LIST_REGEX = /^[\s]*[-*•]\s+|^\s*\d+\.\s+/m;
const TABLE_REGEX = /\|.*\|.*\|/;
const SPECIFICS_REGEX = /\b\d{4}[-/]\d{2}[-/]\d{2}\b|\b\d+%|\b\d+\.\d+\b|€|Art\.\s*\d+/;

const extractSectionContents = (content: string): ReadonlyMap<string, string> => {
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

// --- Validator Loading ---

let cachedValidators: readonly DocumentValidator[] | null = null;

const VALIDATORS_DIR = new URL('../validators/', import.meta.url);

export const loadValidators = (): readonly DocumentValidator[] => {
  if (cachedValidators !== null) return cachedValidators;

  const dirPath = new URL('.', VALIDATORS_DIR).pathname;
  const files = readdirSync(dirPath).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

  const isDocumentValidator = (v: unknown): v is DocumentValidator =>
    typeof v === 'object' && v !== null && 'document' in v && 'obligation' in v && 'file_patterns' in v;

  const validators: DocumentValidator[] = [];
  for (const file of files) {
    const content = readFileSync(join(dirPath, file), 'utf-8');
    const parsed: unknown = parseYaml(content);
    if (isDocumentValidator(parsed)) {
      validators.push(parsed);
    }
  }

  cachedValidators = validators;
  return validators;
};

export const clearValidatorCache = (): void => {
  cachedValidators = null;
};

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
  const obligationId = `eu-ai-act-${validator.obligation}`;
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

    for (const sectionTitle of found) {
      // Find matching heading in extracted contents
      const matchedHeading = [...sectionContents.keys()].find((h) =>
        headingMatches(h, sectionTitle),
      );
      if (matchedHeading !== undefined) {
        const sectionContent = sectionContents.get(matchedHeading) ?? '';
        const depth = measureSectionDepth(sectionContent);
        if (depth.isShallow) {
          shallowSections.push(sectionTitle);
        }
      }
    }

    const shallowRatio = found.length > 0 ? shallowSections.length / found.length : 0;
    const status: L2Status = shallowRatio > 0.5 ? 'SHALLOW' : 'VALID';

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
    };
  }

  const status: L2Status = missing.length === 0
    ? 'VALID'
    : found.length === 0
      ? 'EMPTY'
      : 'PARTIAL';

  return {
    obligationId,
    article: validator.article,
    document: validator.document,
    status,
    foundSections: found,
    missingSections: missing,
    totalRequired: requiredSections.length,
    matchedRequired: found.length,
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
      return {
        type: 'fail',
        checkId: `l2-${r.document}`,
        message: `${r.article}: ${r.document} — headings present but content is shallow in: ${shallowList}`,
        severity: 'medium',
        obligationId: r.obligationId,
        articleReference: r.article,
        fix: `Expand shallow sections in ${r.document} with details (dates, specifics, lists): ${shallowList}`,
      };
    }

    if (r.status === 'PARTIAL') {
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
