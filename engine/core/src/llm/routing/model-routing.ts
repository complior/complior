/**
 * Model routing — maps task types to model selections per provider.
 * Business logic extracted from infra/llm-adapter.ts to keep
 * infrastructure layer as a pure adapter.
 */
import type { ProviderName, ModelSelection } from '../../ports/llm.port.js';

export type TaskType = 'qa' | 'code' | 'report' | 'classify' | 'chat' | 'document-generation';

const MODEL_MAP: Readonly<Record<ProviderName, Readonly<Record<TaskType, string>>>> = {
  openai: {
    qa: 'gpt-4o-mini',
    code: 'gpt-4o',
    report: 'gpt-4o',
    classify: 'gpt-4o-mini',
    chat: 'gpt-4o',
    'document-generation': 'gpt-4o',
  },
  anthropic: {
    qa: 'claude-haiku-4-5-20251001',
    code: 'claude-sonnet-4-5-20250929',
    report: 'claude-sonnet-4-5-20250929',
    classify: 'claude-haiku-4-5-20251001',
    chat: 'claude-sonnet-4-5-20250929',
    'document-generation': 'claude-sonnet-4-5-20250929',
  },
  openrouter: {
    qa: 'anthropic/claude-haiku-4.5',
    code: 'anthropic/claude-sonnet-4.5',
    report: 'anthropic/claude-sonnet-4.5',
    classify: 'anthropic/claude-haiku-4.5',
    chat: 'anthropic/claude-sonnet-4.5',
    'document-generation': 'anthropic/claude-sonnet-4.5',
  },
};

const TASK_REASONS: Readonly<Record<TaskType, string>> = {
  qa: 'Fast, cheap model for simple Q&A',
  code: 'Balanced model for code generation',
  report: 'Powerful model for detailed reports',
  classify: 'Fast model for classification tasks',
  chat: 'Balanced model for interactive chat',
  'document-generation': 'Powerful model for detailed document creation',
};

const isTaskType = (s: string): s is TaskType => s in TASK_REASONS;

/** Route a task type to a concrete model selection for a given provider. */
export const routeModelForProvider = (taskType: string, provider: ProviderName): ModelSelection => {
  const validType = isTaskType(taskType) ? taskType : 'chat';
  return {
    provider,
    modelId: MODEL_MAP[provider][validType],
    reason: TASK_REASONS[validType],
  };
};
