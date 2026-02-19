import type { LlmPort, ProviderName, ProviderInfo, ModelSelection } from '../ports/llm.port.js';
import { LLMError } from '../types/errors.js';

type TaskType = 'qa' | 'code' | 'report' | 'classify' | 'chat';

const PROVIDERS: readonly ProviderInfo[] = [
  { name: 'openai', available: false, envVar: 'OPENAI_API_KEY' },
  { name: 'anthropic', available: false, envVar: 'ANTHROPIC_API_KEY' },
  { name: 'openrouter', available: false, envVar: 'OPENROUTER_API_KEY' },
];

const MODEL_MAP: Record<ProviderName, Record<TaskType, string>> = {
  openai: {
    qa: 'gpt-4o-mini',
    code: 'gpt-4o',
    report: 'gpt-4o',
    classify: 'gpt-4o-mini',
    chat: 'gpt-4o',
  },
  anthropic: {
    qa: 'claude-haiku-4-5-20251001',
    code: 'claude-sonnet-4-5-20250929',
    report: 'claude-sonnet-4-5-20250929',
    classify: 'claude-haiku-4-5-20251001',
    chat: 'claude-sonnet-4-5-20250929',
  },
  openrouter: {
    qa: 'anthropic/claude-haiku-4-5-20251001',
    code: 'anthropic/claude-sonnet-4-5-20250929',
    report: 'anthropic/claude-sonnet-4-5-20250929',
    classify: 'anthropic/claude-haiku-4-5-20251001',
    chat: 'anthropic/claude-sonnet-4-5-20250929',
  },
};

const TASK_REASONS: Record<TaskType, string> = {
  qa: 'Fast, cheap model for simple Q&A',
  code: 'Balanced model for code generation',
  report: 'Powerful model for detailed reports',
  classify: 'Fast model for classification tasks',
  chat: 'Balanced model for interactive chat',
};

export const createLlmAdapter = (): LlmPort => {
  const detectProviders = (): readonly ProviderInfo[] =>
    PROVIDERS.map((p) => ({
      ...p,
      available: process.env[p.envVar] !== undefined && process.env[p.envVar] !== '',
    }));

  const getAvailableProviders = (): readonly ProviderInfo[] =>
    detectProviders().filter((p) => p.available);

  const getDefaultProvider = (): ProviderName => {
    const available = getAvailableProviders();
    if (available.length === 0) {
      throw new LLMError('No LLM provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
    }
    return available[0]!.name;
  };

  const routeModel = (taskType: string, preferredProvider?: ProviderName): ModelSelection => {
    const provider = preferredProvider ?? getDefaultProvider();
    const modelId = MODEL_MAP[provider][taskType as TaskType];

    return {
      provider,
      modelId,
      reason: TASK_REASONS[taskType as TaskType],
    };
  };

  const getModel = async (
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

  return Object.freeze({ getModel, detectProviders, getAvailableProviders, getDefaultProvider, routeModel });
};

export type LlmAdapter = ReturnType<typeof createLlmAdapter>;
