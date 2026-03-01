// Pricing per 1M tokens (USD) — updated Feb 2026
export interface ModelPricing {
  readonly input: number;
  readonly output: number;
}

export const PRICING: Record<string, ModelPricing> = {
  // Anthropic
  'claude-opus-4': { input: 15.0, output: 75.0 },
  'claude-sonnet-4': { input: 3.0, output: 15.0 },
  'claude-haiku-4': { input: 0.80, output: 4.0 },
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'o1': { input: 15.0, output: 60.0 },
  // Google
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.0-pro': { input: 1.25, output: 5.0 },
  // Mistral
  'mistral-large': { input: 2.0, output: 6.0 },
  'mistral-small': { input: 0.20, output: 0.60 },
};

export const calculateCost = (
  model: string,
  inputTokens: number,
  outputTokens: number,
): number => {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
};
