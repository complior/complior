import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

export const loggingStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'interaction-logging') return null;

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

const logs: AIInteractionLog[] = [];

export const logInteraction = (entry: Omit<AIInteractionLog, 'timestamp'>): void => {
  logs.push({ ...entry, timestamp: new Date().toISOString() });
};

export const getInteractionLogs = (): readonly AIInteractionLog[] => [...logs];

export const clearLogs = (): void => { logs.length = 0; };
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
