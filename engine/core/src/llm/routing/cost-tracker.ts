import type { TaskType } from './model-router.js';
import { calculateCost } from './pricing.js';

export interface CostEntry {
  readonly taskType: TaskType;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cost: number;
  readonly timestamp: number;
}

export interface CostBreakdown {
  readonly entries: readonly CostEntry[];
  readonly totalCost: number;
  readonly totalTokens: number;
  readonly byTaskType: Record<string, { calls: number; tokens: number; cost: number }>;
  readonly sessionDuration: number;
}

export const createCostTracker = () => {
  const entries: CostEntry[] = [];
  const startTime = Date.now();

  const record = (
    taskType: TaskType,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): CostEntry => {
    const cost = calculateCost(model, inputTokens, outputTokens);
    const entry: CostEntry = {
      taskType,
      model,
      inputTokens,
      outputTokens,
      cost,
      timestamp: Date.now(),
    };
    entries.push(entry);
    return entry;
  };

  const getBreakdown = (): CostBreakdown => {
    const byTaskType: Record<string, { calls: number; tokens: number; cost: number }> = {};

    for (const e of entries) {
      const existing = byTaskType[e.taskType] ?? { calls: 0, tokens: 0, cost: 0 };
      byTaskType[e.taskType] = {
        calls: existing.calls + 1,
        tokens: existing.tokens + e.inputTokens + e.outputTokens,
        cost: existing.cost + e.cost,
      };
    }

    return {
      entries,
      totalCost: entries.reduce((sum, e) => sum + e.cost, 0),
      totalTokens: entries.reduce((sum, e) => sum + e.inputTokens + e.outputTokens, 0),
      byTaskType,
      sessionDuration: Date.now() - startTime,
    };
  };

  const formatCostLine = (entry: CostEntry): string => {
    const tokens = entry.inputTokens + entry.outputTokens;
    return `~$${entry.cost.toFixed(2)} (${tokens.toLocaleString()} tokens: ${entry.inputTokens.toLocaleString()} in + ${entry.outputTokens.toLocaleString()} out)`;
  };

  return Object.freeze({ record, getBreakdown, formatCostLine });
};

export type CostTracker = ReturnType<typeof createCostTracker>;
