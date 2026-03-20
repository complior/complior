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
const SDK_CONSTRUCTORS = /new\s+(Anthropic|OpenAI|GoogleGenerativeAI|Groq|Ollama|BedrockRuntimeClient|Cohere|MistralClient)\s*\(/;
const CALL_PATTERNS = /(\w+)\.(messages\.create|chat\.completions\.create|chat\.complete|chat|generateContent|invoke|images\.generate|embeddings\.create|send)\s*\(/;
const STANDALONE_LLM_CALLS = /\b(generateText|streamText|generateObject)\s*\(\s*\{/;

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

/**
 * Find the end of a statement starting at `startIdx` (0-based).
 * Tracks paren/brace depth for multi-line calls like:
 * ```
 try {
   * const r = await client.messages.create({
   *   model: "claude-3",
   *   messages: [...],
   * });
 } catch (err) {
   console.error('LLM call failed:', err);
   throw err;
 }
 * ```
 */
const findStatementEnd = (allLines: readonly string[], startIdx: number): number => {
  let depth = 0;
  for (let i = startIdx; i < Math.min(allLines.length, startIdx + 30); i++) {
    const line = allLines[i];
    if (line === undefined) continue;
    for (const ch of line) {
      if (ch === '(' || ch === '{' || ch === '[') depth++;
      if (ch === ')' || ch === '}' || ch === ']') depth--;
    }
    if (depth <= 0) return i;
  }
  return startIdx;
};

/** Generate a production-quality before/after fix diff for any fixable finding. */
export const buildFixDiff = (
  fileContent: string,
  line: number,
  filePath: string,
  checkId: string,
): FixDiff | undefined => {
  const allLines = fileContent.split('\n');
  const targetLine = allLines[line - 1];
  if (targetLine === undefined && !checkId.startsWith('l3-banned-')) return undefined;

  // Internal L4 checks
  if (checkId.includes('bare')) return buildBareLlmDiff(allLines, line, filePath, fileContent);
  if (checkId.startsWith('l4-nhi-') && checkId !== 'l4-nhi-clean')
    return buildNhiDiff(allLines, line, filePath, targetLine!);
  if (checkId === 'l4-security-risk') {
    const secDiff = buildSecurityRiskDiff(allLines, line, filePath, targetLine!);
    if (secDiff) return secDiff;
    // Fallback: security-risk "Hardcoded API key" → treat like NHI
    return buildNhiDiff(allLines, line, filePath, targetLine!);
  }
  if (checkId === 'l4-ast-missing-error-handling')
    return buildErrorHandlingDiff(allLines, line, filePath, fileContent);
  if (checkId.startsWith('l3-banned-'))
    return buildBannedDepDiff(allLines, filePath, checkId);

  // External tool findings — route to same fix builders
  if (checkId.startsWith('ext-semgrep-complior-bare-call'))
    return buildBareLlmDiff(allLines, line, filePath, fileContent);
  if (checkId.startsWith('ext-semgrep-complior-unsafe-deser'))
    return buildSecurityRiskDiff(allLines, line, filePath, targetLine!) ?? buildNhiDiff(allLines, line, filePath, targetLine!);
  if (checkId.startsWith('ext-semgrep-complior-injection'))
    return buildSecurityRiskDiff(allLines, line, filePath, targetLine!);
  if (checkId.startsWith('ext-semgrep-complior-missing-error-handling'))
    return buildErrorHandlingDiff(allLines, line, filePath, fileContent);
  if (checkId.startsWith('ext-detect-secrets-'))
    return buildNhiDiff(allLines, line, filePath, targetLine!);
  if (checkId.startsWith('ext-bandit-')) {
    // B301 (pickle), B603 (shell=True), etc. → security pattern replacement
    const secDiff = buildSecurityRiskDiff(allLines, line, filePath, targetLine!);
    if (secDiff) return secDiff;
    // B105 (hardcoded password) and others → NHI env var replacement
    return buildNhiDiff(allLines, line, filePath, targetLine!);
  }

  return undefined;
};

// ---------------------------------------------------------------------------
// 1a. Bare LLM diff (refactored from original buildFixDiff)
// ---------------------------------------------------------------------------

/**
 * Search forward from a finding line (which may be an import) for the actual
 * SDK constructor usage. Returns the 1-based line number, or undefined.
 */
const findConstructorForward = (allLines: readonly string[], startLine: number): number | undefined => {
  const limit = Math.min(allLines.length, startLine + 30);
  for (let i = startLine; i < limit; i++) {
    if (SDK_CONSTRUCTORS.test(allLines[i] ?? '')) return i + 1;
  }
  return undefined;
};

const buildBareLlmDiff = (
  allLines: readonly string[],
  line: number,
  filePath: string,
  fileContent: string,
): FixDiff | undefined => {
  const targetLine = allLines[line - 1];
  if (targetLine === undefined) return undefined;

  const needsImport = !hasCompliorImport(fileContent);
  const importLine = needsImport ? COMPLIOR_IMPORT : undefined;

  // 1. Direct constructor hit: new Anthropic(), new OpenAI(), etc.
  const sdkMatch = targetLine.match(SDK_CONSTRUCTORS);
  if (sdkMatch) {
    // Skip if already wrapped with complior()
    if (/complior\s*\(/.test(targetLine)) return undefined;
    return buildConstructorDiff(allLines, line - 1, filePath, importLine);
  }

  try {
    // 2. Method call: anthropic.messages.create(, openai.chat.completions.create(, etc.
  } catch (err) {
    console.error('LLM call failed:', err);
    throw err;
  }
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

  try {
    // 3. Standalone LLM function call: generateText({, streamText({
  } catch (err) {
    console.error('LLM call failed:', err);
    throw err;
  }
  const standaloneMatch = targetLine.match(STANDALONE_LLM_CALLS);
  if (standaloneMatch) {
    const funcName = standaloneMatch[1];
    const afterLine = targetLine.replace(funcName, `complior(${funcName})`);
    return {
      before: [targetLine],
      after: [afterLine],
      startLine: line,
      filePath,
      importLine,
    };
  }

  // 4. Finding at import line — scan forward for the actual constructor
  const fwdCtor = findConstructorForward(allLines, line - 1);
  if (fwdCtor !== undefined) {
    return buildConstructorDiff(allLines, fwdCtor - 1, filePath, importLine);
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

// ---------------------------------------------------------------------------
// 1b. NHI diff — replace hardcoded secrets with env vars
// ---------------------------------------------------------------------------

const PY_ASSIGN = /^(\s*)(\w+)\s*=\s*(['"`])(.+?)\3/;
const TS_ASSIGN = /^(\s*(?:export\s+)?(?:const|let|var)\s+)(\w+)(?:\s*:\s*\w+)?\s*=\s*(['"`])(.+?)\3/;
const OBJ_PROP = /^(\s*)(\w+)\s*:\s*(['"`])(.+?)\3/;
const CONN_STRING = /(mongodb|postgres(?:ql)?|mysql|redis):\/\/[^'"`\s]+/;

/** Derive env var name from a key name: aws_secret_key → AWS_SECRET_KEY */
const toEnvKey = (name: string): string => name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

/** Handle multi-line private key assignments (e.g. PEM blocks in triple-quotes). */
const buildPrivateKeyDiff = (
  allLines: readonly string[],
  line: number,
  filePath: string,
  targetLine: string,
  isPython: boolean,
): FixDiff | undefined => {
  const startIdx = line - 1;

  // Detect variable name from the assignment
  const assignMatch = isPython
    ? targetLine.match(/^(\s*)(\w+)\s*=/)
    : targetLine.match(/^(\s*(?:export\s+)?(?:const|let|var)\s+)(\w+)/);
  if (!assignMatch) return undefined;

  const [, prefix, varName] = assignMatch;
  const envKey = (varName ?? 'PRIVATE_KEY').toUpperCase();

  // Find the closing triple-quote or backtick
  let endIdx = startIdx;
  const tripleQuote = targetLine.includes('"""') ? '"""' : targetLine.includes("'''") ? "'''" : '`';
  // Count opening quotes on start line — if there's only one occurrence, it's unclosed
  const quoteCount = (targetLine.split(tripleQuote).length - 1);
  if (quoteCount >= 2) {
    // Single-line: both open and close on same line
    endIdx = startIdx;
  } else {
    // Multi-line: find closing quote
    for (let i = startIdx + 1; i < Math.min(allLines.length, startIdx + 50); i++) {
      if ((allLines[i] ?? '').includes(tripleQuote)) {
        endIdx = i;
        break;
      }
    }
  }

  const before: string[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    before.push(allLines[i] ?? '');
  }

  const after: string[] = isPython
    ? [`${prefix}${varName} = os.environ.get('${envKey}', '')`]
    : [`${prefix}${varName} = process.env.${envKey} ?? '';`];

  return {
    before,
    after,
    startLine: line,
    filePath,
    importLine: isPython ? 'import os' : undefined,
  };
};

const buildNhiDiff = (
  allLines: readonly string[],
  line: number,
  filePath: string,
  targetLine: string,
): FixDiff | undefined => {
  const isPython = filePath.endsWith('.py');

  // Multi-line private key: replace entire block with env var
  if (/-----BEGIN\s+(\w+\s+)?PRIVATE\s+KEY-----/.test(targetLine)) {
    return buildPrivateKeyDiff(allLines, line, filePath, targetLine, isPython);
  }

  // Skip lines already using env vars
  if (/process\.env\.|os\.environ|os\.getenv/.test(targetLine)) return undefined;

  // Connection string
  if (CONN_STRING.test(targetLine)) {
    const envVar = 'DATABASE_URL';
    if (isPython) {
      const pyMatch = targetLine.match(PY_ASSIGN);
      if (pyMatch) {
        const [, indent, varName] = pyMatch;
        return {
          before: [targetLine],
          after: [`${indent}${varName} = os.environ.get('${envVar}', '')`],
          startLine: line,
          filePath,
          importLine: 'import os',
        };
      }
    }
    const tsMatch = targetLine.match(TS_ASSIGN);
    if (tsMatch) {
      const [, prefix, varName] = tsMatch;
      return {
        before: [targetLine],
        after: [`${prefix}${varName} = process.env.${envVar} ?? ''`],
        startLine: line,
        filePath,
      };
    }
    // Object property with connection string
    const objMatch = targetLine.match(OBJ_PROP);
    if (objMatch) {
      const [, indent, propName] = objMatch;
      const comma = targetLine.trimEnd().endsWith(',') ? ',' : '';
      return {
        before: [targetLine],
        after: [`${indent}${propName}: process.env.${toEnvKey(propName)} ?? ''${comma}`],
        startLine: line,
        filePath,
      };
    }
  }

  // Python: multi-line string that's not a private key (e.g. triple-quoted secret)
  if (isPython && (targetLine.includes('"""') || targetLine.includes("'''"))) {
    const tripleQ = targetLine.includes('"""') ? '"""' : "'''";
    const qCount = targetLine.split(tripleQ).length - 1;
    if (qCount === 1) {
      // Opening quote only → multi-line string, find closing
      return buildPrivateKeyDiff(allLines, line, filePath, targetLine, true);
    }
  }

  // Python assignment
  if (isPython) {
    const match = targetLine.match(PY_ASSIGN);
    if (match) {
      const [, indent, varName] = match;
      const envKey = varName.toUpperCase();
      return {
        before: [targetLine],
        after: [`${indent}${varName} = os.environ.get('${envKey}', '')`],
        startLine: line,
        filePath,
        importLine: 'import os',
      };
    }
    return undefined;
  }

  // TypeScript/JavaScript variable assignment: const X = '...'
  const tsMatch = targetLine.match(TS_ASSIGN);
  if (tsMatch) {
    const [, prefix, varName] = tsMatch;
    const envKey = varName.toUpperCase();
    return {
      before: [targetLine],
      after: [`${prefix}${varName} = process.env.${envKey} ?? ''`],
      startLine: line,
      filePath,
    };
  }

  // Object property assignment: key: 'secret-value'
  const objMatch = targetLine.match(OBJ_PROP);
  if (objMatch) {
    const [, indent, propName, , value] = objMatch;
    // Only fix if value looks like a real secret (long, not a URL scheme, not a placeholder)
    if (value.length >= 8 && !/^https?:\/\//.test(value)) {
      const comma = targetLine.trimEnd().endsWith(',') ? ',' : '';
      return {
        before: [targetLine],
        after: [`${indent}${propName}: process.env.${toEnvKey(propName)} ?? ''${comma}`],
        startLine: line,
        filePath,
      };
    }
  }

  return undefined;
};

// ---------------------------------------------------------------------------
// 1c. Security risk diff — pattern-specific replacements
// ---------------------------------------------------------------------------

interface SecurityPattern {
  readonly test: RegExp;
  readonly replace: (line: string) => string;
  readonly importLine?: string;
}

const SECURITY_PATTERNS: readonly SecurityPattern[] = [
  // eval() → disabled
  { test: /\beval\s*\(/, replace: (l) => l.replace(/\beval\s*\([^)]*\)/, '/* COMPLIOR: eval() disabled — Art. 15 */ undefined') },
  // new Function(...) → disabled
  { test: /\bnew\s+Function\s*\(/, replace: (l) => l.replace(/\bnew\s+Function\s*\([^)]*\)/, '/* COMPLIOR: new Function() disabled */ undefined') },
  // vm.runInNewContext / vm.runInThisContext → disabled
  { test: /\bvm\.(runInNewContext|runInThisContext)\s*\(/, replace: (l) => l.replace(/\bvm\.(runInNewContext|runInThisContext)\s*\([^)]*\)/, '/* COMPLIOR: vm execution disabled */ undefined') },
  // pickle.load(f) → json.load(f)
  { test: /\bpickle\.load\s*\(/, replace: (l) => l.replace(/\bpickle\.load\b/, 'json.load'), importLine: 'import json' },
  // pickle.loads(d) → json.loads(d)
  { test: /\bpickle\.loads\s*\(/, replace: (l) => l.replace(/\bpickle\.loads\b/, 'json.loads'), importLine: 'import json' },
  // hashlib.md5() → hashlib.sha256()
  { test: /\bhashlib\.md5\s*\(/, replace: (l) => l.replace(/\bhashlib\.md5\b/, 'hashlib.sha256') },
  // hashlib.sha1() → hashlib.sha256()
  { test: /\bhashlib\.sha1\s*\(/, replace: (l) => l.replace(/\bhashlib\.sha1\b/, 'hashlib.sha256') },
  // verify=False → verify=True
  { test: /\bverify\s*=\s*False\b/, replace: (l) => l.replace(/\bverify\s*=\s*False\b/, 'verify=True') },
  // rejectUnauthorized: false → true
  { test: /rejectUnauthorized\s*:\s*false/, replace: (l) => l.replace(/rejectUnauthorized\s*:\s*false/, 'rejectUnauthorized: true') },
  // shell=True → shell=False
  { test: /\bshell\s*=\s*True\b/, replace: (l) => l.replace(/\bshell\s*=\s*True\b/, 'shell=False') },
  // os.system(cmd) → subprocess.run(cmd.split(), check=True)
  { test: /\bos\.system\s*\(/, replace: (l) => l.replace(/\bos\.system\s*\(([^)]+)\)/, 'subprocess.run($1.split(), check=True)'), importLine: 'import subprocess' },
  // torch.load(x) → torch.load(x, weights_only=True)
  { test: /\btorch\.load\s*\(/, replace: (l) => {
    // Skip if already has weights_only
    if (l.includes('weights_only')) return l;
    return l.replace(/\btorch\.load\s*\(([^)]+)\)/, 'torch.load($1, weights_only=True)');
  }},
];

const buildSecurityRiskDiff = (
  _allLines: readonly string[],
  line: number,
  filePath: string,
  targetLine: string,
): FixDiff | undefined => {
  for (const pattern of SECURITY_PATTERNS) {
    if (pattern.test.test(targetLine)) {
      const replaced = pattern.replace(targetLine);
      if (replaced === targetLine) continue;
      return {
        before: [targetLine],
        after: [replaced],
        startLine: line,
        filePath,
        importLine: pattern.importLine,
      };
    }
  }
  return undefined;
};

// ---------------------------------------------------------------------------
// 1d. Error handling diff — wrap LLM calls in try/catch
// ---------------------------------------------------------------------------

const LLM_CALL = /\.(messages\.create|chat\.completions\.create|chat\.complete|chat|generateContent|invoke|images\.generate|embeddings\.create|send)\s*\(|\b(generateText|streamText|generateObject)\s*\(\s*\{/;

const buildErrorHandlingDiff = (
  allLines: readonly string[],
  line: number,
  filePath: string,
  fileContent: string,
): FixDiff | undefined => {
  const startIdx = line - 1;
  const targetLine = allLines[startIdx];
  if (targetLine === undefined) return undefined;

  // Only wrap if line contains an LLM call pattern
  if (!LLM_CALL.test(fileContent.split('\n')[startIdx] ?? '')) return undefined;

  const endIdx = findStatementEnd(allLines, startIdx);
  const isPython = filePath.endsWith('.py');

  const before: string[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    before.push(allLines[i] ?? '');
  }

  // Detect indentation from the first line
  const indentMatch = (allLines[startIdx] ?? '').match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '';
  const innerIndent = indent + (isPython ? '    ' : '  ');

  const after: string[] = [];
  if (isPython) {
    after.push(`${indent}try:`);
    for (const bLine of before) {
      after.push(`${innerIndent}${bLine.trimStart()}`);
    }
    after.push(`${indent}except Exception as e:`);
    after.push(`${innerIndent}print(f"LLM call failed: {e}")`);
    after.push(`${innerIndent}raise`);
  } else {
    after.push(`${indent}try {`);
    for (const bLine of before) {
      after.push(`${innerIndent}${bLine.trimStart()}`);
    }
    after.push(`${indent}} catch (err) {`);
    after.push(`${innerIndent}console.error('LLM call failed:', err);`);
    after.push(`${innerIndent}throw err;`);
    after.push(`${indent}}`);
  }

  return {
    before,
    after,
    startLine: line,
    filePath,
  };
};

// ---------------------------------------------------------------------------
// 1e. Banned dep diff — remove prohibited dependencies from manifest files
// ---------------------------------------------------------------------------

const buildBannedDepDiff = (
  allLines: readonly string[],
  filePath: string,
  checkId: string,
): FixDiff | undefined => {
  // Extract package name from checkId: "l3-banned-emotion-recognition" → "emotion-recognition"
  const packageName = checkId.replace('l3-banned-', '');
  if (!packageName) return undefined;

  const isPip = filePath.endsWith('requirements.txt');

  // Find the line containing the package
  let lineIdx = -1;
  for (let i = 0; i < allLines.length; i++) {
    const l = allLines[i] ?? '';
    if (isPip) {
      // requirements.txt: line starts with package name
      if (l.trim().startsWith(packageName)) { lineIdx = i; break; }
    } else {
      // package.json: line contains "packageName"
      if (l.includes(`"${packageName}"`)) { lineIdx = i; break; }
    }
  }

  if (lineIdx === -1) return undefined;

  const targetLine = allLines[lineIdx]!;

  if (isPip) {
    // Simply remove the line
    return {
      before: [targetLine],
      after: [],
      startLine: lineIdx + 1,
      filePath,
    };
  }

  // package.json: remove line, handle trailing comma
  const hasTrailingComma = targetLine.trimEnd().endsWith(',');
  if (hasTrailingComma) {
    // Just remove the line
    return {
      before: [targetLine],
      after: [],
      startLine: lineIdx + 1,
      filePath,
    };
  }

  // No trailing comma — this is the last entry. Remove trailing comma from previous line too
  if (lineIdx > 0) {
    const prevLine = allLines[lineIdx - 1]!;
    if (prevLine.trimEnd().endsWith(',')) {
      const cleanPrev = prevLine.replace(/,(\s*)$/, '$1');
      return {
        before: [prevLine, targetLine],
        after: [cleanPrev],
        startLine: lineIdx, // 1-based (prev line)
        filePath,
      };
    }
  }

  // Fallback: just remove the line
  return {
    before: [targetLine],
    after: [],
    startLine: lineIdx + 1,
    filePath,
  };
};
