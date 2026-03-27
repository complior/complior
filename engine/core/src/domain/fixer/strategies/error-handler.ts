import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

export const errorHandlerStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'l4-security-risk' && finding.checkId !== 'l4-ast-missing-error-handling') return null;

  const filePath = 'src/middleware/ai-error-handler.ts';
  const content = `// AI Error Handler (EU AI Act, Art. 15.4)
// Compliance-aware error handling for AI operations

export interface AIErrorLog {
  readonly timestamp: string;
  readonly operation: string;
  readonly error: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly aiSystemId?: string;
}

const errorLog: AIErrorLog[] = [];

export const withAIErrorHandling = async <T>(
  operation: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    const entry: AIErrorLog = {
      timestamp: new Date().toISOString(),
      operation,
      error: err instanceof Error ? err.message : String(err),
      severity: 'high',
    };
    errorLog.push(entry);
    console.error(\`[AI-ERROR] \${operation}: \${entry.error}\`);
    return fallback;
  }
};

export const getErrorLog = (): readonly AIErrorLog[] => [...errorLog];
`;

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: 'Create AI error handler with compliance logging',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-008',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 15(4)',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 4,
    commitMessage: 'fix: add AI error handler (Art. 15.4) -- via Complior',
    description: 'Add compliance-aware error handling with incident logging',
  };
};
