import { LLMError } from '../types/errors.js';

export type ProviderName = 'openai' | 'anthropic' | 'openrouter';

export interface ProviderInfo {
  readonly name: ProviderName;
  readonly available: boolean;
  readonly envVar: string;
}

const PROVIDERS: readonly ProviderInfo[] = [
  { name: 'openai', available: false, envVar: 'OPENAI_API_KEY' },
  { name: 'anthropic', available: false, envVar: 'ANTHROPIC_API_KEY' },
  { name: 'openrouter', available: false, envVar: 'OPENROUTER_API_KEY' },
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

export const getModel = async (
  provider: ProviderName,
  modelId: string,
  apiKey?: string,
): Promise<unknown> => {
  switch (provider) {
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai');
      const client = createOpenAI({ apiKey: apiKey || process.env['OPENAI_API_KEY'] });
      return client(modelId);
    }
    case 'anthropic': {
      const { createAnthropic } = await import('@ai-sdk/anthropic');
      const client = createAnthropic({ apiKey: apiKey || process.env['ANTHROPIC_API_KEY'] });
      return client(modelId);
    }
    case 'openrouter': {
      const { createOpenAI } = await import('@ai-sdk/openai');
      const client = createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey || process.env['OPENROUTER_API_KEY'],
      });
      return client(modelId);
    }
    default:
      throw new LLMError(`Unknown provider: ${String(provider)}`);
  }
};
