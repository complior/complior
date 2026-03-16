/**
 * Lightweight structural analysis for TypeScript/JavaScript code.
 * Approximates AST patterns using targeted regex (no external parser dependency).
 * Detects: bare LLM calls vs wrapped calls, safety config mutations, error handling.
 */

import { getLineNumber } from '../source-filter.js';

export interface StructuralFinding {
  readonly type: 'bare-call' | 'wrapped-call' | 'safety-mutation' | 'missing-error-handling' | 'decorator-pattern';
  readonly file: string;
  readonly line: number;
  readonly description: string;
  readonly confidence: number; // 0-100
}

/** Detect function definitions that wrap LLM calls with pre/post logic */
const WRAPPER_PATTERNS = [
  // Function that calls LLM and has logging/validation
  /(?:async\s+)?function\s+\w+[^{]*\{[^}]*(?:log|validate|check|verify|audit)[^}]*(?:create|generate|invoke|chat|complete)[^}]*\}/gs,
  // Arrow function with compliance logic
  /const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*\w+)?\s*=>\s*\{[^}]*(?:log|validate|check)[^}]*(?:create|generate)[^}]*\}/gs,
];

/** Detect safety config mutations (disabling safety features) */
const SAFETY_MUTATION_PATTERNS = [
  /(?:config|options|settings)\s*\.\s*(?:safety|moderation|filter|guard)\s*=\s*(?:false|'none'|"none"|null|0|undefined)/gi,
  /(?:disable|skip|bypass)(?:Safety|Moderation|Filter|Guard|Check|Validation)\s*[=(]/gi,
  /(?:safety|moderation|filter)\s*:\s*(?:false|'none'|"none"|'off'|"off")/gi,
  /\.(?:unsafe|dangerouslyAllow|skipValidation|noCheck)\s*\(/gi,
];

/** Detect try-catch around LLM calls ([\s\S]*? allows nested braces) */
const TRY_CATCH_LLM = /try\s*\{[\s\S]*?(?:\.create|\.generate|\.invoke|\.chat|generateText|streamText)[\s\S]*?\}\s*catch/gs;

/** Detect Python decorator patterns for compliance */
const PYTHON_DECORATOR_PATTERNS = [
  /@(?:require_approval|log_ai_call|audit|compliance|rate_limit|authorize|validate_input)/g,
  /def\s+\w+\s*\([^)]*\)\s*(?:->.*)?:\s*\n\s+"""[^"]*compliance[^"]*"""/gi,
];

export const analyzeStructure = (
  content: string,
  filePath: string,
  extension: string,
): readonly StructuralFinding[] => {
  const findings: StructuralFinding[] = [];

  const getLine = (index: number): number => getLineNumber(content, index);

  if (['.ts', '.tsx', '.js', '.jsx'].includes(extension)) {
    // Check for LLM calls without try-catch
    const llmCallRegex = /(?:\.create|\.generate|\.invoke|\.chat|generateText|streamText)\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = llmCallRegex.exec(content)) !== null) {
      const lineNum = getLine(match.index);

      // Check if this call is inside a try-catch
      const hasTryCatch = TRY_CATCH_LLM.test(content);
      TRY_CATCH_LLM.lastIndex = 0; // Reset

      if (!hasTryCatch) {
        findings.push({
          type: 'missing-error-handling',
          file: filePath,
          line: lineNum,
          description: `LLM call without try-catch error handling at line ${lineNum}`,
          confidence: 70,
        });
      }
    }

    // Check for wrapper patterns (positive — compliance mechanism)
    for (const pattern of WRAPPER_PATTERNS) {
      pattern.lastIndex = 0;
      let wrapMatch: RegExpExecArray | null;
      while ((wrapMatch = pattern.exec(content)) !== null) {
        findings.push({
          type: 'wrapped-call',
          file: filePath,
          line: getLine(wrapMatch.index),
          description: 'LLM call with pre/post compliance logic (wrapper pattern)',
          confidence: 75,
        });
      }
    }

    // Check for safety mutations
    for (const pattern of SAFETY_MUTATION_PATTERNS) {
      pattern.lastIndex = 0;
      let safetyMatch: RegExpExecArray | null;
      while ((safetyMatch = pattern.exec(content)) !== null) {
        findings.push({
          type: 'safety-mutation',
          file: filePath,
          line: getLine(safetyMatch.index),
          description: `Safety feature disabled/bypassed: "${safetyMatch[0].trim()}"`,
          confidence: 85,
        });
      }
    }
  }

  if (extension === '.py') {
    // Python decorator patterns
    for (const pattern of PYTHON_DECORATOR_PATTERNS) {
      pattern.lastIndex = 0;
      let decMatch: RegExpExecArray | null;
      while ((decMatch = pattern.exec(content)) !== null) {
        findings.push({
          type: 'decorator-pattern',
          file: filePath,
          line: getLine(decMatch.index),
          description: `Compliance decorator: "${decMatch[0].trim()}"`,
          confidence: 80,
        });
      }
    }
  }

  return findings;
};
