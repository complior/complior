import type { PostHook } from '../../types.js';
import { BudgetExceededError } from '../../errors.js';
import { extractResponseMeta, getNumericField } from '../../runtime/response-wrapper.js';

/** Default cost estimates per 1K tokens by provider (USD). Override via costRates parameter. */
const DEFAULT_COST_PER_1K: Record<string, { input: number; output: number }> = {
  openai: { input: 0.003, output: 0.015 },
  anthropic: { input: 0.003, output: 0.015 },
  google: { input: 0.001, output: 0.002 },
  'vercel-ai': { input: 0.003, output: 0.015 },
  unknown: { input: 0.003, output: 0.015 },
};

const estimateCost = (
  provider: string,
  response: unknown,
  costRates: Record<string, { input: number; output: number }>,
): number => {
  const rates = costRates[provider] ?? costRates['unknown'] ?? DEFAULT_COST_PER_1K['unknown']!;
  const meta = extractResponseMeta(response);
  return (meta.inputTokens * rates.input + meta.outputTokens * rates.output) / 1000;
};

/** C.R12: Track cumulative cost, block when exceeding budget */
export const createBudgetHook = (
  limitUsd: number,
  onExceeded: 'warn' | 'block' = 'block',
  costRates?: Record<string, { input: number; output: number }>,
): PostHook => {
  let totalCost = 0;
  const rates = costRates ?? DEFAULT_COST_PER_1K;

  return (ctx, response) => {
    const cost = estimateCost(ctx.provider, response, rates);
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
