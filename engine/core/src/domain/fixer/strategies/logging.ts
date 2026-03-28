import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

export const loggingStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'interaction-logging' && finding.checkId !== 'l4-logging') return null;

  const loggerPath = 'src/logging/ai-interaction-logger.ts';
  const content = `// AI Interaction Logger (EU AI Act, Art. 12)
// Automatic logging of AI system interactions for traceability

export interface AIInteractionLog {
  readonly timestamp: string;
  readonly sessionId: string;
  readonly inputHash: string;
  readonly outputHash: string;
  readonly model: string;
  readonly provider: string;
  readonly durationMs: number;
  readonly tokensUsed?: number;
}

const auditLog: AIInteractionLog[] = [];

/** Log an AI interaction for compliance traceability (Art. 12). */
export const logAiCall = (entry: Omit<AIInteractionLog, 'timestamp'>): void => {
  auditLog.push({ ...entry, timestamp: new Date().toISOString() });
};

export const aiLogger = {
  log: logAiCall,
  getAll: (): readonly AIInteractionLog[] => [...auditLog],
  clear: (): void => { auditLog.length = 0; },
};

// Legacy aliases
export const logInteraction = logAiCall;
export const getInteractionLogs = aiLogger.getAll;
export const clearLogs = aiLogger.clear;
`;
  const action: FixAction = {
    type: 'create',
    path: loggerPath,
    content,
    description: 'Create AI interaction logger for traceability',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-007',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 12',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(loggerPath, content),
    scoreImpact: 5,
    commitMessage: 'fix: add AI interaction logger (Art. 12) -- via Complior',
    description: 'Add automatic logging of AI system interactions for traceability',
  };
};
