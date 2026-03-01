import type { CodeContext, CodeContextLine, FixDiff } from '../../types/common.types.js';

const CONTEXT_LINES = 5;

/** Extract surrounding source lines for a finding with file+line. */
export const buildCodeContext = (
  fileContent: string,
  line: number,
): CodeContext => {
  const allLines = fileContent.split('\n');
  const startLine = Math.max(1, line - CONTEXT_LINES);
  const endLine = Math.min(allLines.length, line + CONTEXT_LINES);
  const lines: CodeContextLine[] = [];
  for (let i = startLine; i <= endLine; i++) {
    lines.push({ num: i, content: allLines[i - 1] ?? '' });
  }
  return { lines, startLine, highlightLine: line };
};

const COMPLIOR_IMPORT = "import { complior } from '@complior/sdk';";
const SDK_CONSTRUCTORS = /new\s+(Anthropic|OpenAI|GoogleGenerativeAI)\s*\(/;
const CALL_PATTERNS = /(\w+)\.(messages\.create|chat\.completions\.create|chat\.complete|generateContent)\s*\(/;

/** Check whether the file already imports @complior/sdk. */
const hasCompliorImport = (fileContent: string): boolean =>
  fileContent.includes('@complior/sdk');

/**
 * Search backward from `startLine` (1-based) for a constructor assignment like
 * `const foo = new Anthropic({` matching `varName`. Returns the 1-based line
 * number of the constructor, or undefined if not found.
 */
const findConstructorLine = (
  allLines: readonly string[],
  varName: string,
  startLine: number,
): number | undefined => {
  // Walk backward up to 50 lines
  const searchFrom = Math.max(0, startLine - 2); // -2 because startLine is 1-based
  const searchTo = Math.max(0, startLine - 52);
  for (let i = searchFrom; i >= searchTo; i--) {
    const line = allLines[i];
    if (line === undefined) continue;
    // Match: const/let/var varName = new SDK(
    if (line.includes(varName) && SDK_CONSTRUCTORS.test(line)) {
      return i + 1; // 1-based
    }
  }
  return undefined;
};

/**
 * Find the closing line of a constructor call starting at `startIdx` (0-based).
 * Tracks parenthesis depth to handle multi-line constructors like:
 * ```
 * const c = new Anthropic({
 *   apiKey: "...",
 * });
 * ```
 * Returns the 0-based index of the line containing the final `);` or `})`.
 */
const findConstructorEnd = (allLines: readonly string[], startIdx: number): number => {
  let depth = 0;
  for (let i = startIdx; i < Math.min(allLines.length, startIdx + 20); i++) {
    const line = allLines[i];
    if (line === undefined) continue;
    for (const ch of line) {
      if (ch === '(' || ch === '{') depth++;
      if (ch === ')' || ch === '}') depth--;
    }
    if (depth <= 0) return i;
  }
  return startIdx; // fallback: single line
};

/** Generate a production-quality before/after fix diff for bare-llm findings. */
export const buildFixDiff = (
  fileContent: string,
  line: number,
  filePath: string,
  checkId: string,
): FixDiff | undefined => {
  const allLines = fileContent.split('\n');
  const targetLine = allLines[line - 1];
  if (targetLine === undefined) return undefined;

  if (!checkId.includes('bare')) return undefined;

  const needsImport = !hasCompliorImport(fileContent);
  const importLine = needsImport ? COMPLIOR_IMPORT : undefined;

  // 1. Direct constructor hit: new Anthropic(), new OpenAI(), etc.
  const sdkMatch = targetLine.match(SDK_CONSTRUCTORS);
  if (sdkMatch) {
    return buildConstructorDiff(allLines, line - 1, filePath, importLine);
  }

  // 2. Method call: anthropic.messages.create(, openai.chat.completions.create(, etc.
  const callMatch = targetLine.match(CALL_PATTERNS);
  if (callMatch) {
    const varName = callMatch[1];

    // Try to find constructor and wrap THERE (idiomatic SDK usage)
    const ctorLine = findConstructorLine(allLines, varName, line);
    if (ctorLine !== undefined) {
      return buildConstructorDiff(allLines, ctorLine - 1, filePath, importLine);
    }

    // Fallback: wrap at call site (when constructor is in another file)
    const afterLine = targetLine.replace(varName + '.', `complior(${varName}).`);
    return {
      before: [targetLine],
      after: [afterLine],
      startLine: line,
      filePath,
      importLine,
    };
  }

  return undefined;
};

/** Build a before/after diff for a constructor wrapping. Handles multi-line constructors. */
const buildConstructorDiff = (
  allLines: readonly string[],
  ctorIdx: number,
  filePath: string,
  importLine: string | undefined,
): FixDiff => {
  const endIdx = findConstructorEnd(allLines, ctorIdx);
  const before: string[] = [];
  const after: string[] = [];

  for (let i = ctorIdx; i <= endIdx; i++) {
    const original = allLines[i] ?? '';
    before.push(original);

    if (i === ctorIdx) {
      // First line: add complior( before `new`
      after.push(original.replace(SDK_CONSTRUCTORS, 'complior(new $1('));
    } else if (i === endIdx) {
      // Last line: add closing `)` before `;`
      const closed = original.replace(/\)\s*;/, '));');
      after.push(closed === original ? original + ')' : closed);
    } else {
      after.push(original);
    }
  }

  return { before, after, startLine: ctorIdx + 1, filePath, importLine };
};
