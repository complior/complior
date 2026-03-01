import type { ProviderAdapter } from '../types.js';

export const anthropicAdapter: ProviderAdapter = {
  name: 'anthropic',
  getMethodProxy: (target, method) => {
    if (method === 'messages') {
      return createMessagesProxy(target);
    }
    return null;
  },
};

const createMessagesProxy = (target: unknown) => {
  return new Proxy(target as object, {
    get(obj, prop) {
      if (prop === 'create') {
        return (obj as Record<string, unknown>)['create'];
      }
      return (obj as Record<string, unknown>)[prop as string];
    },
  }) as unknown as (...args: unknown[]) => unknown;
};

export const ANTHROPIC_PROXY_METHODS = ['messages.create'] as const;
