import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';
import type { L3CheckResult } from './layer3-config.js';
import { PATTERN_RULES } from '../rules/pattern-rules.js';
import type { PatternCategory } from '../rules/pattern-rules.js';
import { isSourceFile, getLineNumber } from '../source-filter.js';
import { stripCommentsOnly } from '../rules/comment-filter.js';

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
    isSourceFile(f.relativePath, f.extension),
  );

  if (sourceFiles.length === 0) return results;

  // Track which positive categories were found across all files
  const positiveFound = new Map<PatternCategory, L4CheckResult>();
  const negativeFound: L4CheckResult[] = [];

  // Pre-compute comment-stripped content per file (E-109)
  const strippedCache = new Map<string, string>();
  for (const file of sourceFiles) {
    strippedCache.set(file.relativePath, stripCommentsOnly(file.content, file.extension));
  }

  for (const file of sourceFiles) {
    const stripped = strippedCache.get(file.relativePath) ?? file.content;
    for (const rule of PATTERN_RULES) {
      // Reset regex lastIndex for global patterns
      rule.regex.lastIndex = 0;

      // For negative patterns, find ALL matches (each is a separate violation).
      // For positive patterns, first match is enough.
      if (rule.patternType === 'negative') {
        let match: RegExpExecArray | null;
        while ((match = rule.regex.exec(stripped)) !== null) {
          negativeFound.push({
            obligationId: rule.obligationId,
            article: rule.article,
            category: rule.category,
            patternType: rule.patternType,
            status: 'FOUND',
            file: file.relativePath,
            line: getLineNumber(file.content, match.index),
            matchedPattern: rule.label,
            recommendation: rule.recommendation,
          });
          if (!rule.regex.global) break;
        }
      } else {
        const match = rule.regex.exec(stripped);
        if (match !== null && !positiveFound.has(rule.category)) {
          positiveFound.set(rule.category, {
            obligationId: rule.obligationId,
            article: rule.article,
            category: rule.category,
            patternType: rule.patternType,
            status: 'FOUND',
            file: file.relativePath,
            line: getLineNumber(file.content, match.index),
            matchedPattern: rule.label,
            recommendation: rule.recommendation,
          });
        }
      }
    }
  }

  // Filter out bare-llm findings from files that already use @complior/sdk wrapper.
  // When a file imports @complior/sdk AND wraps constructors with complior(), method
  // calls like `anthropic.messages.create()` are already compliant.
  const wrappedFiles = new Set<string>();
  for (const file of sourceFiles) {
    if (file.content.includes('@complior/sdk') && /complior\s*\(/.test(file.content)) {
      wrappedFiles.add(file.relativePath);
    }
  }

  // Add negative findings, skipping bare-llm in wrapped files
  for (const r of negativeFound) {
    if (r.category === 'bare-llm' && r.file !== undefined && wrappedFiles.has(r.file)) continue;
    results.push(r);
  }

  // Add positive findings (good patterns found)
  for (const result of positiveFound.values()) {
    results.push(result);
  }

  // Check for missing positive patterns (only if AI SDK detected)
  const shouldCheckPositives = hasAiSdk;

  if (shouldCheckPositives) {
    const positiveCategories: PatternCategory[] = [
      'disclosure', 'human-oversight', 'kill-switch', 'content-marking', 'logging',
      'data-governance', 'record-keeping', 'deployer-monitoring',
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
    // Bare LLM calls are informational — not a compliance violation
    if (r.patternType === 'negative' && r.status === 'FOUND' && r.category === 'bare-llm') {
      const location = r.file !== undefined ? ` in ${r.file}:${r.line}` : '';
      return {
        type: 'info',
        checkId: `l4-${r.category}`,
        message: `Bare LLM API call detected${location}. Consider @complior/sdk for runtime compliance.`,
        severity: 'info',
        obligationId: r.obligationId,
        articleReference: r.article,
        fix: 'Optional: wrap with @complior/sdk for runtime Art. 50/12/14 enforcement',
        file: r.file,
        line: r.line,
      };
    }

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
        file: r.file,
        line: r.line,
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
        file: r.file,
        line: r.line,
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
