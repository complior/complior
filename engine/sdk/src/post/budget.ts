import type { PostHook } from '../types.js';
import { BudgetExceededError } from '../errors.js';

// Rough cost estimates per 1K tokens by provider
const COST_PER_1K: Record<string, { input: number; output: number }> = {
  openai: { input: 0.003, output: 0.015 },
  anthropic: { input: 0.003, output: 0.015 },
  google: { input: 0.001, output: 0.002 },
  'vercel-ai': { input: 0.003, output: 0.015 },
  unknown: { input: 0.003, output: 0.015 },
};

const estimateCost = (provider: string, response: unknown): number => {
  const rates = COST_PER_1K[provider] ?? COST_PER_1K['unknown']!;
  const resp = response as Record<string, unknown> | null;
  if (!resp) return 0;

  // Try to extract usage from response
  const usage = resp['usage'] as Record<string, number> | undefined;
  if (!usage) return 0;

  const inputTokens = usage['prompt_tokens'] ?? usage['promptTokens'] ?? usage['input_tokens'] ?? 0;
  const outputTokens = usage['completion_tokens'] ?? usage['completionTokens'] ?? usage['output_tokens'] ?? 0;

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
