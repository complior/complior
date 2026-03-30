/**
 * Model routing — maps task types to model selections per provider.
 * Business logic extracted from infra/llm-adapter.ts to keep
 * infrastructure layer as a pure adapter.
 */
import type { ProviderName, ModelSelection } from '../../ports/llm.port.js';
import routingData from '../../../data/llm/model-routing.json' with { type: 'json' };

export type TaskType = 'qa' | 'code' | 'report' | 'classify' | 'chat' | 'document-generation';

const MODEL_MAP = routingData.model_map as Readonly<Record<ProviderName, Readonly<Record<TaskType, string>>>>;

const TASK_REASONS = routingData.task_reasons as Readonly<Record<TaskType, string>>;

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
