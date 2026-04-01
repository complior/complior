import type { Finding } from '../../types/common.types.js';
import type { FixPlan, FixAction, FixContext } from './types.js';
import { findStrategy } from './strategies/index.js';
import { generateUnifiedDiff } from './diff.js';

export interface FixerDeps {
  readonly getFramework: () => string;
  readonly getProjectPath: () => string;
  readonly getExistingFiles: () => readonly string[];
}

const descFor = (checkId: string, filePath: string, line: number): string => {
  if (checkId.includes('bare-call') || checkId.includes('bare')) return `wrap bare LLM call at ${filePath}:${line}`;
  if (checkId.startsWith('l4-nhi-') || checkId.startsWith('ext-detect-secrets-')) return `externalize secret at ${filePath}:${line}`;
  if (checkId === 'l4-security-risk' || checkId.includes('unsafe-deser') || checkId.includes('injection')) return `fix security risk at ${filePath}:${line}`;
  if (checkId === 'l4-ast-missing-error-handling' || checkId.includes('missing-error-handling')) return `add error handling at ${filePath}:${line}`;
  if (checkId.startsWith('l3-banned-')) return `remove banned dependency from ${filePath}`;
  if (checkId.startsWith('ext-bandit-')) return `fix security issue at ${filePath}:${line}`;
  return `inline fix at ${filePath}:${line}`;
};

const commitMsgFor = (checkId: string, article: string): string => {
  if (checkId.includes('bare-call') || checkId.includes('bare')) return `fix: wrap bare LLM call with @complior/sdk (${article || 'Art. 50'}) -- via Complior`;
  if (checkId.startsWith('l4-nhi-') || checkId.startsWith('ext-detect-secrets-')) return `fix: externalize hardcoded secret (${article || 'Art. 15'}) -- via Complior`;
  if (checkId === 'l4-security-risk' || checkId.includes('unsafe-deser') || checkId.includes('injection')) return `fix: remediate security risk (${article || 'Art. 15'}) -- via Complior`;
  if (checkId === 'l4-ast-missing-error-handling' || checkId.includes('missing-error-handling')) return `fix: add LLM error handling (${article || 'Art. 14'}) -- via Complior`;
  if (checkId.startsWith('l3-banned-')) return `fix: remove banned dependency (${article || 'Art. 5'}) -- via Complior`;
  if (checkId.startsWith('ext-bandit-')) return `fix: remediate security issue (${article || 'Art. 15'}) -- via Complior`;
  return `fix: inline compliance fix (${article || 'EU AI Act'}) -- via Complior`;
};

const buildInlineFixPlan = (finding: Finding): FixPlan => {
  const diff = finding.fixDiff!;
  const desc = descFor(finding.checkId, diff.filePath, diff.startLine);
  const action: FixAction = {
    type: 'splice',
    path: diff.filePath,
    beforeLines: diff.before,
    afterLines: diff.after,
    startLine: diff.startLine,
    importLine: diff.importLine,
    description: `Inline fix: ${desc}`,
  };

  return {
    obligationId: finding.obligationId ?? '',
    checkId: finding.checkId,
    article: finding.articleReference ?? '',
    fixType: 'code_injection',
    framework: '',
    actions: [action],
    diff: generateUnifiedDiff(diff.filePath, diff.before.join('\n'), diff.after.join('\n')),
    scoreImpact: 6,
    commitMessage: commitMsgFor(finding.checkId, finding.articleReference ?? ''),
    description: `Inline fix: ${desc}`,
  };
};

export const createFixer = (deps: FixerDeps) => {
  const { getFramework, getProjectPath, getExistingFiles } = deps;

  const buildContext = (options?: { useAi?: boolean }): FixContext => ({
    projectPath: getProjectPath(),
    framework: getFramework(),
    existingFiles: getExistingFiles(),
    useAi: options?.useAi,
  });

  const generateFix = (finding: Finding, options?: { useAi?: boolean }): FixPlan | null => {
    if (finding.type !== 'fail') return null;
    // Priority 1: Inline fix from scanner fixDiff
    if (finding.fixDiff) return buildInlineFixPlan(finding);
    // Priority 2: Strategy-based scaffold
    return findStrategy(finding, buildContext(options));
  };

  const generateFixes = (findings: readonly Finding[], options?: { useAi?: boolean }): readonly FixPlan[] => {
    const plans: FixPlan[] = [];
    const seen = new Set<string>();
    for (const finding of findings) {
      const plan = generateFix(finding, options);
      if (plan === null) continue;
      // Deduplicate: splice by path:startLine, others by output path
      const key = plan.actions[0]?.type === 'splice'
        ? `${plan.actions[0].path}:${plan.actions[0].startLine}`
        : plan.actions[0]?.path ?? plan.checkId;
      if (seen.has(key)) continue;
      seen.add(key);
      plans.push(plan);
    }
    return plans;
  };

  const previewFix = (finding: Finding): FixPlan | null => {
    return generateFix(finding);
  };

  return Object.freeze({ generateFix, generateFixes, previewFix });
};

export type Fixer = ReturnType<typeof createFixer>;
