/**
 * Factory for dual-pattern scanner checks.
 * Handles the common pattern: search files for "positive" indicators,
 * search for "context" indicators, return pass/fail/skip.
 *
 * Used by: ai-disclosure (Art. 50.1), content-marking (Art. 50.2).
 */
import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext, FileInfo } from '../../../ports/scanner.port.js';

export interface PatternCheckConfig {
  readonly checkId: string;
  readonly articleRef: string;
  readonly obligationId: string;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  /** Patterns that indicate compliance (e.g., disclosure text, watermarking). */
  readonly positivePatterns: readonly RegExp[];
  /** Patterns that indicate the feature IS used but compliance is missing (e.g., chat code, content generation). */
  readonly contextPatterns: readonly RegExp[];
  readonly passMessage: string;
  readonly failMessage: string;
  readonly skipReason: string;
  readonly fix: string;
  /** Optional file filter (e.g., only UI files). Defaults to all files. */
  readonly fileFilter?: (file: FileInfo) => boolean;
}

export const createPatternCheck = (config: PatternCheckConfig) =>
  (ctx: ScanContext): readonly CheckResult[] => {
    const files = config.fileFilter ? ctx.files.filter(config.fileFilter) : ctx.files;

    let positiveFound = false;
    let contextFound = false;

    for (const file of files) {
      if (!positiveFound && config.positivePatterns.some((p) => p.test(file.content))) {
        positiveFound = true;
      }
      if (!contextFound && config.contextPatterns.some((p) => p.test(file.content))) {
        contextFound = true;
      }
      if (positiveFound) break;
    }

    if (positiveFound) {
      return [{
        type: 'pass',
        checkId: config.checkId,
        message: `${config.passMessage} (${config.articleRef})`,
      }];
    }

    if (contextFound) {
      return [{
        type: 'fail',
        checkId: config.checkId,
        message: `${config.failMessage} (${config.articleRef})`,
        severity: config.severity,
        obligationId: config.obligationId,
        articleReference: config.articleRef,
        fix: config.fix,
      }];
    }

    return [{
      type: 'skip',
      checkId: config.checkId,
      reason: config.skipReason,
    }];
  };
