import type { Finding } from '../../types/common.types.js';
import type { FixPlan, FixContext } from './types.js';
import { findStrategy } from './strategies.js';

export interface FixerDeps {
  readonly getFramework: () => string;
  readonly getProjectPath: () => string;
  readonly getExistingFiles: () => readonly string[];
}

export const createFixer = (deps: FixerDeps) => {
  const { getFramework, getProjectPath, getExistingFiles } = deps;

  const buildContext = (): FixContext => ({
    projectPath: getProjectPath(),
    framework: getFramework(),
    existingFiles: getExistingFiles(),
  });

  const generateFix = (finding: Finding): FixPlan | null => {
    if (finding.type !== 'fail') return null;
    return findStrategy(finding, buildContext());
  };

  const generateFixes = (findings: readonly Finding[]): readonly FixPlan[] => {
    const plans: FixPlan[] = [];
    for (const finding of findings) {
      const plan = generateFix(finding);
      if (plan !== null) plans.push(plan);
    }
    return plans;
  };

  const previewFix = (finding: Finding): FixPlan | null => {
    return generateFix(finding);
  };

  return Object.freeze({ generateFix, generateFixes, previewFix });
};

export type Fixer = ReturnType<typeof createFixer>;
