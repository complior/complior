import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';
import type { L3CheckResult } from './layer3-config.js';
import { PATTERN_RULES, SCANNABLE_EXTENSIONS, IGNORED_DIRS } from '../rules/pattern-rules.js';
import type { PatternCategory } from '../rules/pattern-rules.js';

// --- Types ---

export interface L4CheckResult {
  readonly obligationId: string;
  readonly article: string;
  readonly category: PatternCategory;
  readonly patternType: 'positive' | 'negative';
  readonly status: 'FOUND' | 'NOT_FOUND';
  readonly file?: string;
  readonly line?: number;
  readonly matchedPattern: string;
  readonly recommendation: string;
}

// --- Helpers ---

const isScannableFile = (relativePath: string, extension: string): boolean => {
  if (!SCANNABLE_EXTENSIONS.has(extension)) return false;

  const parts = relativePath.split('/');
  return !parts.some((part) => IGNORED_DIRS.has(part));
};

const getLineNumber = (content: string, index: number): number => {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
};

// --- L4 Runner ---

export const runLayer4 = (
  ctx: ScanContext,
  l3Results: readonly L3CheckResult[],
): readonly L4CheckResult[] => {
  const results: L4CheckResult[] = [];

  // Determine which AI SDKs were detected by L3
  const detectedSdks = l3Results
    .filter((r) => r.type === 'ai-sdk-detected')
    .map((r) => r.packageName ?? '');
  const hasAiSdk = detectedSdks.length > 0;

  // Get scannable source files
  const sourceFiles = ctx.files.filter((f) =>
    isScannableFile(f.relativePath, f.extension),
  );

  if (sourceFiles.length === 0) return results;

  // Track which positive categories were found across all files
  const positiveFound = new Map<PatternCategory, L4CheckResult>();
  const negativeFound: L4CheckResult[] = [];

  for (const file of sourceFiles) {
    for (const rule of PATTERN_RULES) {
      // Reset regex lastIndex for global patterns
      rule.regex.lastIndex = 0;
      const match = rule.regex.exec(file.content);

      if (match !== null) {
        const result: L4CheckResult = {
          obligationId: rule.obligationId,
          article: rule.article,
          category: rule.category,
          patternType: rule.patternType,
          status: 'FOUND',
          file: file.relativePath,
          line: getLineNumber(file.content, match.index),
          matchedPattern: rule.label,
          recommendation: rule.recommendation,
        };

        if (rule.patternType === 'negative') {
          negativeFound.push(result);
        } else if (!positiveFound.has(rule.category)) {
          positiveFound.set(rule.category, result);
        }
      }
    }
  }

  // Add all negative findings (bad patterns found)
  results.push(...negativeFound);

  // Add positive findings (good patterns found)
  for (const result of positiveFound.values()) {
    results.push(result);
  }

  // Check for missing positive patterns (only if AI SDK detected or bare LLM calls found)
  const shouldCheckPositives = hasAiSdk || negativeFound.some((r) => r.category === 'bare-llm');

  if (shouldCheckPositives) {
    const positiveCategories: PatternCategory[] = [
      'disclosure', 'human-oversight', 'kill-switch', 'content-marking', 'logging',
    ];

    for (const category of positiveCategories) {
      if (!positiveFound.has(category)) {
        const rule = PATTERN_RULES.find((r) => r.category === category);
        if (rule !== undefined) {
          results.push({
            obligationId: rule.obligationId,
            article: rule.article,
            category,
            patternType: 'positive',
            status: 'NOT_FOUND',
            matchedPattern: rule.label,
            recommendation: rule.recommendation,
          });
        }
      }
    }
  }

  return results;
};

// --- Convert to CheckResults ---

export const layer4ToCheckResults = (l4Results: readonly L4CheckResult[]): readonly CheckResult[] => {
  return l4Results.map((r): CheckResult => {
    // Negative pattern found → warning (bad)
    if (r.patternType === 'negative' && r.status === 'FOUND') {
      const location = r.file !== undefined ? ` in ${r.file}:${r.line}` : '';
      return {
        type: 'fail',
        checkId: `l4-${r.category}`,
        message: `WARNING: ${r.matchedPattern}${location} — ${r.obligationId} ${r.article}`,
        severity: 'medium',
        obligationId: r.obligationId,
        articleReference: r.article,
        fix: r.recommendation,
      };
    }

    // Positive pattern found → pass (good)
    if (r.patternType === 'positive' && r.status === 'FOUND') {
      const location = r.file !== undefined ? ` in ${r.file}:${r.line}` : '';
      return {
        type: 'pass',
        checkId: `l4-${r.category}`,
        message: `${r.matchedPattern} found${location} (${r.article})`,
      };
    }

    // Positive pattern NOT found → warning (missing)
    if (r.patternType === 'positive' && r.status === 'NOT_FOUND') {
      return {
        type: 'fail',
        checkId: `l4-${r.category}`,
        message: `WARNING: No ${r.category} pattern found — ${r.obligationId} ${r.article}`,
        severity: 'low',
        obligationId: r.obligationId,
        articleReference: r.article,
        fix: r.recommendation,
      };
    }

    // Negative NOT_FOUND = pass (absence of bad pattern is good)
    return {
      type: 'pass',
      checkId: `l4-${r.category}`,
      message: `No ${r.category} issues detected`,
    };
  });
};
