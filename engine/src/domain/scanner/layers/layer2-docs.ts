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

export type L2Status = 'VALID' | 'PARTIAL' | 'EMPTY';

export interface L2CheckResult {
  readonly obligationId: string;
  readonly article: string;
  readonly document: string;
  readonly status: L2Status;
  readonly foundSections: readonly string[];
  readonly missingSections: readonly string[];
  readonly totalRequired: number;
  readonly matchedRequired: number;
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

// --- Validator Loading ---

let cachedValidators: readonly DocumentValidator[] | null = null;

const VALIDATORS_DIR = new URL('../../../core/scanner/validators/', import.meta.url);

export const loadValidators = (): readonly DocumentValidator[] => {
  if (cachedValidators !== null) return cachedValidators;

  const dirPath = new URL('.', VALIDATORS_DIR).pathname;
  const files = readdirSync(dirPath).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

  const validators: DocumentValidator[] = [];
  for (const file of files) {
    const content = readFileSync(join(dirPath, file), 'utf-8');
    const parsed = parseYaml(content) as DocumentValidator;
    validators.push(parsed);
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
