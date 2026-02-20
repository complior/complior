import type { ProviderAdapter } from '../types.js';

export const googleAdapter: ProviderAdapter = {
  name: 'google',
  getMethodProxy: (_target, method) => {
    if (method === 'generateContent') {
      return null; // Handled at top level
    }
    return null;
  },
};

export const GOOGLE_PROXY_METHODS = ['generateContent'] as const;
