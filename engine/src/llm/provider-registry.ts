import { LLMError } from '../types/errors.js';

export type ProviderName = 'openai' | 'anthropic';

export interface ProviderInfo {
  readonly name: ProviderName;
  readonly available: boolean;
  readonly envVar: string;
}

const PROVIDERS: readonly ProviderInfo[] = [
  { name: 'openai', available: false, envVar: 'OPENAI_API_KEY' },
  { name: 'anthropic', available: false, envVar: 'ANTHROPIC_API_KEY' },
];

export const detectProviders = (): readonly ProviderInfo[] =>
  PROVIDERS.map((p) => ({
    ...p,
    available: process.env[p.envVar] !== undefined && process.env[p.envVar] !== '',
  }));

export const getAvailableProviders = (): readonly ProviderInfo[] =>
  detectProviders().filter((p) => p.available);

export const getDefaultProvider = (): ProviderName => {
  const available = getAvailableProviders();

  if (available.length === 0) {
    throw new LLMError('No LLM provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
  }

  return available[0]!.name;
};

export const getModel = async (provider: ProviderName, modelId: string): Promise<unknown> => {
  switch (provider) {
    case 'openai': {
      const { openai } = await import('@ai-sdk/openai');
      return openai(modelId);
    }
    case 'anthropic': {
      const { anthropic } = await import('@ai-sdk/anthropic');
      return anthropic(modelId);
    }
    default:
      throw new LLMError(`Unknown provider: ${String(provider)}`);
  }
};
