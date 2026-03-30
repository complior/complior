import pricingData from '../../../data/llm/model-pricing.json' with { type: 'json' };

// Pricing per 1M tokens (USD)
export interface ModelPricing {
  readonly input: number;
  readonly output: number;
}

export const PRICING: Record<string, ModelPricing> = pricingData.models;

export const calculateCost = (
  model: string,
  inputTokens: number,
  outputTokens: number,
): number => {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
};
