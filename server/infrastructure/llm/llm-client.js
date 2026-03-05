'use strict';

const { generateText } = require('ai');
const { createMistral } = require('@ai-sdk/mistral');
const { createOpenAICompatible } = require('@ai-sdk/openai-compatible');

const llmConfig = require('../../../app/config/llm.js');

const createNoopClient = () => ({
  async generateText() {
    throw new Error('LLM not configured — set MISTRAL_API_KEY or OPENROUTER_API_KEY');
  },
  provider: null,
  resolveModel: (alias) => alias,
});

const createLlmClient = (config = llmConfig) => {
  const { provider, defaults } = config;

  // Create Vercel AI SDK provider instance
  let aiProvider;
  if (provider === 'mistral') {
    if (!config.mistral.apiKey) return createNoopClient();
    aiProvider = createMistral({ apiKey: config.mistral.apiKey });
  } else {
    if (!config.openrouter.apiKey) return createNoopClient();
    aiProvider = createOpenAICompatible({
      name: 'openrouter',
      baseURL: config.openrouter.baseURL,
      apiKey: config.openrouter.apiKey,
      headers: {
        'HTTP-Referer': config.openrouter.referer,
        'X-Title': config.openrouter.title,
      },
    });
  }

  const resolveModel = (alias) => {
    const mapping = config.models[alias];
    if (!mapping) return alias; // raw model ID fallback
    return mapping[provider] || alias;
  };

  return {
    async generateText({ model, messages, system, maxTokens, temperature }) {
      const modelId = resolveModel(model);
      const result = await generateText({
        model: aiProvider(modelId),
        messages,
        system,
        maxTokens: maxTokens || defaults.maxTokens,
        temperature: temperature ?? defaults.temperature,
      });

      return {
        text: result.text,
        model: modelId,
        usage: result.usage || null,
      };
    },

    // Provider instance exposed for Eva streaming (Sprint 9)
    // Eva route calls streamText() directly with this provider
    provider: aiProvider,
    resolveModel,
  };
};

module.exports = createLlmClient;
