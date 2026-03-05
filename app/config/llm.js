'use strict';

module.exports = {
  provider: process.env.LLM_PROVIDER || 'openrouter', // 'mistral' | 'openrouter'

  mistral: {
    apiKey: process.env.MISTRAL_API_KEY || '',
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    referer: 'https://complior.eu',
    title: 'Complior AI Act Compliance',
  },

  defaults: {
    maxTokens: 1024,
    temperature: 0.4,
  },

  // Model aliases -> provider-specific model IDs
  // Per ARCHITECTURE.md §6.2: Small=classify, Medium=doc-gen, Large=Eva
  models: {
    'doc-writer': {
      mistral: 'mistral-medium-latest',
      openrouter: 'mistralai/mistral-medium-3',
    },
    'eva-chat': {
      mistral: 'mistral-large-latest',
      openrouter: 'mistralai/mistral-large',
    },
    'classifier': {
      mistral: 'mistral-small-latest',
      openrouter: 'mistralai/mistral-small-3.1',
    },
  },
};
