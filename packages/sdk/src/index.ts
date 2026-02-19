import type { MiddlewareConfig, MiddlewareContext, DomainHooks, Domain } from './types.js';
import { createPipeline } from './pipeline.js';
import { getDomainHooks, mergeDomainHooks } from './domains/index.js';

export type { MiddlewareConfig, MiddlewareContext, MiddlewareResult, PreHook, PostHook, DomainHooks, Domain, Jurisdiction, Role } from './types.js';
export { ProhibitedPracticeError, MiddlewareError, DomainViolationError } from './errors.js';
export { getDomainHooks, mergeDomainHooks } from './domains/index.js';

const resolveDomainHooks = (config: MiddlewareConfig): DomainHooks | undefined => {
  if (!config.domain) return undefined;
  const domains = Array.isArray(config.domain) ? config.domain as Domain[] : [config.domain as Domain];
  if (domains.length === 0) return undefined;
  if (domains.length === 1) return getDomainHooks(domains[0]!);
  return mergeDomainHooks(domains);
};

type DetectedProvider = 'openai' | 'anthropic' | 'google' | 'vercel-ai' | 'unknown';

const detectProvider = (client: object): DetectedProvider => {
  const keys = Object.getOwnPropertyNames(Object.getPrototypeOf(client) ?? {});
  const ownKeys = Object.keys(client);
  const allKeys = [...keys, ...ownKeys];

  if (allKeys.includes('chat') || (client as Record<string, unknown>)['chat']) return 'openai';
  if (allKeys.includes('messages') || (client as Record<string, unknown>)['messages']) return 'anthropic';
  if (allKeys.includes('generateContent')) return 'google';
  if (allKeys.includes('streamText') || allKeys.includes('generateText')) return 'vercel-ai';
  return 'unknown';
};

const INTERCEPTED_METHODS: Record<DetectedProvider, readonly string[]> = {
  openai: ['chat'],
  anthropic: ['messages'],
  google: ['generateContent'],
  'vercel-ai': ['streamText', 'generateText'],
  unknown: [],
};

/**
 * Wrap an LLM client with compliance middleware.
 *
 * @example
 * ```ts
 * import OpenAI from 'openai';
 * import { complior } from '@complior/sdk';
 *
 * const openai = complior(new OpenAI(), { jurisdictions: ['EU'] });
 * const response = await openai.chat.completions.create({ ... });
 * ```
 */
export const complior = <T extends object>(
  client: T,
  config: MiddlewareConfig = {},
  domainHooks?: DomainHooks,
): T => {
  const provider = detectProvider(client);

  // Resolve domain hooks from config if not explicitly provided
  const resolvedDomainHooks = domainHooks ?? resolveDomainHooks(config);
  const pipeline = createPipeline(config, resolvedDomainHooks);
  const methods = INTERCEPTED_METHODS[provider];

  return new Proxy(client, {
    get(target, prop, receiver) {
      const key = String(prop);

      if (!methods.includes(key)) {
        return Reflect.get(target, prop, receiver);
      }

      const original = Reflect.get(target, prop, receiver) as object;

      // For OpenAI: proxy chat → chat.completions → chat.completions.create
      if (provider === 'openai' && key === 'chat') {
        return wrapNestedProxy(original, provider, config, pipeline, ['completions'], ['create']);
      }

      // For Anthropic: proxy messages → messages.create
      if (provider === 'anthropic' && key === 'messages') {
        return wrapMethodsProxy(original, provider, config, pipeline, ['create']);
      }

      // For top-level methods (Google, Vercel AI)
      if (typeof original === 'function') {
        return wrapFunction(original.bind(target) as (...args: unknown[]) => unknown, provider, key, config, pipeline);
      }

      return original;
    },
  });
};

const wrapNestedProxy = (
  obj: object,
  provider: string,
  config: MiddlewareConfig,
  pipeline: ReturnType<typeof createPipeline>,
  nestedKeys: readonly string[],
  methodKeys: readonly string[],
): object => {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const key = String(prop);
      const original = Reflect.get(target, prop, receiver);

      if (nestedKeys.includes(key) && typeof original === 'object' && original !== null) {
        return wrapMethodsProxy(original as object, provider, config, pipeline, methodKeys);
      }

      return original;
    },
  });
};

const wrapMethodsProxy = (
  obj: object,
  provider: string,
  config: MiddlewareConfig,
  pipeline: ReturnType<typeof createPipeline>,
  methodKeys: readonly string[],
): object => {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const key = String(prop);
      const original = Reflect.get(target, prop, receiver);

      if (methodKeys.includes(key) && typeof original === 'function') {
        return wrapFunction(original.bind(target) as (...args: unknown[]) => unknown, provider, key, config, pipeline);
      }

      return original;
    },
  });
};

const wrapFunction = (
  fn: (...args: unknown[]) => unknown,
  provider: string,
  method: string,
  config: MiddlewareConfig,
  pipeline: ReturnType<typeof createPipeline>,
): ((...args: unknown[]) => unknown) => {
  return async (...args: unknown[]) => {
    const params = (args[0] ?? {}) as Record<string, unknown>;

    const ctx: MiddlewareContext = {
      provider,
      method,
      config,
      params,
      metadata: {},
    };

    // Run pre-hooks (may throw for prohibited practices)
    const processedCtx = pipeline.runPre(ctx);

    // Call original API
    const response = await fn(processedCtx.params);

    // Run post-hooks
    const result = pipeline.runPost(processedCtx, response);

    // Attach metadata to response
    if (result.response && typeof result.response === 'object') {
      (result.response as Record<string, unknown>)['_complior'] = {
        metadata: result.metadata,
        headers: result.headers,
      };
    }

    return result.response;
  };
};

// Re-export for domain middleware (Step 5)
export { createPipeline } from './pipeline.js';
