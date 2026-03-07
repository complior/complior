import type { PostHook } from '../../types.js';
import { BudgetExceededError } from '../../errors.js';

// Rough cost estimates per 1K tokens by provider
const COST_PER_1K: Record<string, { input: number; output: number }> = {
  openai: { input: 0.003, output: 0.015 },
  anthropic: { input: 0.003, output: 0.015 },
  google: { input: 0.001, output: 0.002 },
  'vercel-ai': { input: 0.003, output: 0.015 },
  unknown: { input: 0.003, output: 0.015 },
};

/** Extract a numeric value from an object by checking multiple possible keys */
const getNumericField = (obj: object, ...keys: string[]): number => {
  for (const key of keys) {
    if (key in obj) {
      const val: unknown = (obj as Record<string, unknown>)[key]; // TS limitation: object → Record for variable keys
      if (typeof val === 'number') return val;
    }
  }
  return 0;
};

const estimateCost = (provider: string, response: unknown): number => {
  const rates = COST_PER_1K[provider] ?? COST_PER_1K['unknown']!;
  if (!response || typeof response !== 'object') return 0;
  if (!('usage' in response)) return 0;

  const usage: unknown = response.usage;
  if (!usage || typeof usage !== 'object') return 0;

  const inputTokens = getNumericField(usage, 'prompt_tokens', 'promptTokens', 'input_tokens');
  const outputTokens = getNumericField(usage, 'completion_tokens', 'completionTokens', 'output_tokens');

  return (inputTokens * rates.input + outputTokens * rates.output) / 1000;
};

/** C.R12: Track cumulative cost, block when exceeding budget */
export const createBudgetHook = (
  limitUsd: number,
  onExceeded: 'warn' | 'block' = 'block',
): PostHook => {
  let totalCost = 0;

  return (ctx, response) => {
    const cost = estimateCost(ctx.provider, response);
    totalCost += cost;

    if (totalCost > limitUsd) {
      if (onExceeded === 'block') {
        throw new BudgetExceededError(
          `Budget exceeded: $${totalCost.toFixed(4)} > $${limitUsd.toFixed(2)} limit`,
          totalCost,
          limitUsd,
        );
      }
    }

    return {
      response,
      metadata: {
        ...ctx.metadata,
        budget: {
          callCost: cost,
          totalCost,
          limitUsd,
          remaining: Math.max(0, limitUsd - totalCost),
        },
      },
      headers: {},
    };
  };
};
