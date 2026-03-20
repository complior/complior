import type { Finding } from '../../../types/common.types.js';

/**
 * Deduplicate findings from external tools against existing L1-L4 findings.
 *
 * Rules:
 * 1. detect-secrets vs NHI scanner: same file+line → keep NHI (richer metadata)
 * 2. Semgrep vs L4 regex: same file+line+similar checkId → keep Semgrep (more precise)
 * 3. Cross-tool: same file+line+similar message → keep first
 */
export const deduplicateFindings = (
  baseFindings: readonly Finding[],
  externalFindings: readonly Finding[],
): readonly Finding[] => {
  // Build a set of base finding keys for O(1) lookup
  const baseKeys = new Set<string>();
  for (const f of baseFindings) {
    if (f.file && f.line !== undefined) {
      baseKeys.add(`${f.file}:${f.line}`);
    }
  }

  const result: Finding[] = [];
  const seenExternal = new Set<string>();

  for (const ext of externalFindings) {
    const fileLineKey = ext.file && ext.line !== undefined
      ? `${ext.file}:${ext.line}`
      : null;

    // Rule 1: detect-secrets vs NHI — skip if NHI already found this file:line
    if (ext.checkId.startsWith('ext-detect-secrets-') && fileLineKey) {
      const nhiDuplicate = baseFindings.some((base) =>
        base.checkId.startsWith('l4-nhi-')
        && base.file === ext.file
        && base.line === ext.line,
      );
      if (nhiDuplicate) continue;
    }

    // Rule 2: Skip non-Semgrep, non-detect-secrets findings if base already has same file:line.
    // Semgrep supersedes L4 in merge step. detect-secrets is handled by Rule 1 (NHI dedup).
    if (fileLineKey && baseKeys.has(fileLineKey)) {
      if (!ext.checkId.startsWith('ext-semgrep-') && !ext.checkId.startsWith('ext-detect-secrets-')) continue;
    }

    // Rule 3: Cross-tool dedup — skip if same tool already reported same file:line
    if (fileLineKey) {
      const dedupKey = `${ext.checkId}:${fileLineKey}`;
      if (seenExternal.has(dedupKey)) continue;
      seenExternal.add(dedupKey);
    }

    result.push(ext);
  }

  return result;
};

/**
 * Merge base L1-L4 findings with deduplicated external findings.
 * Removes L4 findings that have a more precise Semgrep equivalent,
 * transferring fixDiff/codeContext from the superseded L4 finding.
 */
export const mergeFindings = (
  baseFindings: readonly Finding[],
  externalFindings: readonly Finding[],
): readonly Finding[] => {
  // Build map of Semgrep file:line keys → index in externalFindings
  const semgrepKeys = new Map<string, number>();
  for (let i = 0; i < externalFindings.length; i++) {
    const f = externalFindings[i]!;
    if (f.checkId.startsWith('ext-semgrep-') && f.file && f.line !== undefined) {
      semgrepKeys.set(`${f.file}:${f.line}`, i);
    }
  }

  // Transfer fixDiff from superseded L4 findings to their semgrep replacements
  const enrichedExternal = [...externalFindings];
  const filteredBase = baseFindings.filter((f) => {
    if (!f.checkId.startsWith('l4-') || !f.file || f.line === undefined) return true;
    const key = `${f.file}:${f.line}`;
    const extIdx = semgrepKeys.get(key);
    if (extIdx === undefined) return true; // Keep — no semgrep equivalent
    // Transfer fixDiff and codeContext to the semgrep finding
    const ext = enrichedExternal[extIdx]!;
    if (f.fixDiff && !ext.fixDiff) {
      enrichedExternal[extIdx] = { ...ext, fixDiff: f.fixDiff, codeContext: f.codeContext ?? ext.codeContext };
    }
    return false; // Remove — superseded by semgrep
  });

  return [...filteredBase, ...enrichedExternal];
};
