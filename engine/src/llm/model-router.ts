import type { ProviderName } from './provider-registry.js';
import { getDefaultProvider } from './provider-registry.js';

export type TaskType = 'qa' | 'code' | 'report' | 'classify' | 'chat';

interface ModelSelection {
  readonly provider: ProviderName;
  readonly modelId: string;
  readonly reason: string;
}

const MODEL_MAP: Record<ProviderName, Record<TaskType, string>> = {
  openai: {
    qa: 'gpt-4o-mini',
    code: 'gpt-4o',
    report: 'gpt-4o',
    classify: 'gpt-4o-mini',
    chat: 'gpt-4o',
  },
  anthropic: {
    qa: 'claude-haiku-4-5-20251001',
    code: 'claude-sonnet-4-5-20250929',
    report: 'claude-sonnet-4-5-20250929',
    classify: 'claude-haiku-4-5-20251001',
    chat: 'claude-sonnet-4-5-20250929',
  },
};

const TASK_REASONS: Record<TaskType, string> = {
  qa: 'Fast, cheap model for simple Q&A',
  code: 'Balanced model for code generation',
  report: 'Powerful model for detailed reports',
  classify: 'Fast model for classification tasks',
  chat: 'Balanced model for interactive chat',
};

export const routeModel = (
  taskType: TaskType,
  preferredProvider?: ProviderName,
): ModelSelection => {
  const provider = preferredProvider ?? getDefaultProvider();
  const modelId = MODEL_MAP[provider][taskType];

  return {
    provider,
    modelId,
    reason: TASK_REASONS[taskType],
  };
};
