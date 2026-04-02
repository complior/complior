import type { LanguageModel } from 'ai';
import type { LlmPort, ProviderName, ProviderInfo, ModelSelection } from '../ports/llm.port.js';
import { LLMError } from '../types/errors.js';
import { routeModelForProvider } from '../llm/routing/model-routing.js';
import { createLogger } from './logger.js';

const PROVIDERS: readonly ProviderInfo[] = [
  { name: 'openrouter', available: false, envVar: 'OPENROUTER_API_KEY' },
  { name: 'openai', available: false, envVar: 'OPENAI_API_KEY' },
  { name: 'anthropic', available: false, envVar: 'ANTHROPIC_API_KEY' },
];

const log = createLogger('llm-adapter');

const isProviderName = (s: string): s is ProviderName =>
  s === 'openai' || s === 'anthropic' || s === 'openrouter';

export const createLlmAdapter = (): LlmPort => {
  let providerFallbackWarned = false;

  const detectProviders = (): readonly ProviderInfo[] =>
    PROVIDERS.map((p) => ({
      ...p,
      available: process.env[p.envVar] !== undefined && process.env[p.envVar] !== '',
    }));

  const getAvailableProviders = (): readonly ProviderInfo[] =>
    detectProviders().filter((p) => p.available);

  const getDefaultProvider = (): ProviderName => {
    // Env override: explicit provider preference
    const envProvider = process.env['COMPLIOR_LLM_PROVIDER'];
    if (envProvider && isProviderName(envProvider)) {
      const info = detectProviders().find((p) => p.name === envProvider);
      if (info?.available) return envProvider;
      if (!providerFallbackWarned) {
        log.warn(`COMPLIOR_LLM_PROVIDER=${envProvider} but no API key found — falling back to auto-detect`);
        providerFallbackWarned = true;
      }
    }

    const available = getAvailableProviders();
    if (available.length === 0) {
      throw new LLMError('No LLM provider configured. Set OPENROUTER_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in .complior/.env');
    }
    return available[0]!.name;
  };

  const routeModel = (taskType: string, preferredProvider?: ProviderName): ModelSelection =>
    routeModelForProvider(taskType, preferredProvider ?? getDefaultProvider());

  const getModel = async (
    provider: ProviderName,
    modelId: string,
    apiKey?: string,
  ): Promise<LanguageModel> => {
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
        // OpenRouter supports Chat Completions API, not OpenAI Responses API.
        // Use .chat() explicitly — default client() uses Responses API in SDK v2.
        return client.chat(modelId);
      }
      default:
        throw new LLMError(`Unknown provider: ${String(provider)}`);
    }
  };

  return Object.freeze({ getModel, detectProviders, getAvailableProviders, getDefaultProvider, routeModel });
};

export type LlmAdapter = ReturnType<typeof createLlmAdapter>;
