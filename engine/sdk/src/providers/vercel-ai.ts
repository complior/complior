import type { ProviderAdapter } from '../types.js';

export const vercelAiAdapter: ProviderAdapter = {
  name: 'vercel-ai',
  getMethodProxy: (_target, method) => {
    if (method === 'streamText' || method === 'generateText') {
      return null; // Handled at top level
    }
    return null;
  },
};

export const VERCEL_AI_PROXY_METHODS = ['streamText', 'generateText'] as const;
