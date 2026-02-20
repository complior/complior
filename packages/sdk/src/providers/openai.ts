import type { ProviderAdapter } from '../types.js';

export const openaiAdapter: ProviderAdapter = {
  name: 'openai',
  getMethodProxy: (target, method) => {
    if (method === 'chat') {
      return createChatProxy(target);
    }
    return null;
  },
};

const createChatProxy = (target: unknown) => {
  return new Proxy(target as object, {
    get(obj, prop) {
      if (prop === 'completions') {
        return createCompletionsProxy((obj as Record<string, unknown>)['completions']);
      }
      return (obj as Record<string, unknown>)[prop as string];
    },
  }) as unknown as (...args: unknown[]) => unknown;
};

const createCompletionsProxy = (target: unknown) => {
  return new Proxy(target as object, {
    get(obj, prop) {
      if (prop === 'create') {
        return (obj as Record<string, unknown>)['create'];
      }
      return (obj as Record<string, unknown>)[prop as string];
    },
  });
};

export const OPENAI_PROXY_METHODS = ['chat.completions.create'] as const;
