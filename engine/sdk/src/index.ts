import type { MiddlewareConfig, MiddlewareContext, DomainHooks, Domain } from './types.js';
import { createPipeline, type Pipeline } from './pipeline.js';
import { getDomainHooks, mergeDomainHooks } from './domains/index.js';
import { createConfigWatcher, type ConfigWatcher } from './runtime/config-watcher.js';
import { withRetry } from './runtime/retry.js';
import { isStreamResponse, wrapStream, attachMetadata } from './runtime/stream-wrapper.js';

export type { MiddlewareConfig, MiddlewareContext, MiddlewareResult, PreHook, PostHook, DomainHooks, Domain, Jurisdiction, Role, GateRule, GateRequest, GateDecision, RetryConfig } from './types.js';
export { ProhibitedPracticeError, MiddlewareError, DomainViolationError, PermissionDeniedError, BudgetExceededError, RateLimitError, CircuitBreakerError, PIIDetectedError, DisclosureMissingError, BiasDetectedError, SafetyViolationError, HumanGateDeniedError } from './errors.js';
export type { BiasEvidence, SafetyFinding } from './errors.js';
export { getDomainHooks, mergeDomainHooks } from './domains/index.js';
export { compliorAgent } from './agent.js';
export type { AgentConfig } from './agent.js';
export type { ActionLogEntry } from './hooks/post/action-log.js';
export type { CircuitBreakerConfig } from './hooks/post/circuit-breaker.js';
export { extractResponseMeta, extractModel, createHitlGateHook } from './runtime/index.js';
export type { ResponseMeta, InteractionLogEntry } from './runtime/index.js';
export { loadProxyConfig, mergeConfigs } from './runtime/proxy-config.js';
export type { ProxyConfig } from './runtime/proxy-config.js';
export { withRetry } from './runtime/retry.js';
export type { ConfigWatcher } from './runtime/config-watcher.js';

const PROVIDER_HINT = Symbol.for('complior:provider');
const CLOSE_SYMBOL = Symbol.for('complior:close');

const resolveDomainHooks = (config: MiddlewareConfig): DomainHooks | undefined => {
  if (!config.domain) return undefined;
  const domains = Array.isArray(config.domain) ? config.domain as Domain[] : [config.domain as Domain];
  if (domains.length === 0) return undefined;
  if (domains.length === 1) return getDomainHooks(domains[0]!);
  return mergeDomainHooks(domains);
};

type DetectedProvider = 'openai' | 'anthropic' | 'google' | 'vercel-ai' | 'unknown';

const detectProvider = (client: object): DetectedProvider => {
  // 1. Symbol hint (user-provided)
  const hint = (client as Record<symbol, unknown>)[PROVIDER_HINT];
  if (typeof hint === 'string') {
    const normalized = hint.toLowerCase();
    if (normalized === 'openai' || normalized === 'anthropic' || normalized === 'google' || normalized === 'vercel-ai') {
      return normalized as DetectedProvider;
    }
  }

  // 2. Constructor name
  const ctorName = client.constructor?.name;
  if (ctorName === 'OpenAI' || ctorName === 'AzureOpenAI') return 'openai';
  if (ctorName === 'Anthropic') return 'anthropic';

  // 3. Property-based fallback
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

interface PipelineState {
  pipeline: Pipeline;
  config: MiddlewareConfig;
}

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
  const state: PipelineState = { pipeline: createPipeline(config, resolvedDomainHooks), config };
  const methods = INTERCEPTED_METHODS[provider];

  // Hot-reload: set up config watcher if not disabled
  let watcher: ConfigWatcher | undefined;
  if (config.configPath !== false) {
    try {
      watcher = createConfigWatcher(
        config,
        typeof config.configPath === 'string' ? config.configPath : undefined,
      );
      watcher.onChange((newConfig) => {
        const newDomainHooks = domainHooks ?? resolveDomainHooks(newConfig);
        state.pipeline = createPipeline(newConfig, newDomainHooks);
        state.config = newConfig;
      });
    } catch {
      // Config file not found — proceed without watcher
    }
  }

  return new Proxy(client, {
    get(target, prop, receiver) {
      const key = String(prop);

      // Cleanup function
      if (prop === CLOSE_SYMBOL) {
        return () => { watcher?.close(); };
      }

      if (!methods.includes(key)) {
        return Reflect.get(target, prop, receiver);
      }

      const original = Reflect.get(target, prop, receiver) as object;

      // For OpenAI: proxy chat → chat.completions → chat.completions.create
      if (provider === 'openai' && key === 'chat') {
        return wrapNestedProxy(original, provider, state, ['completions'], ['create']);
      }

      // For Anthropic: proxy messages → messages.create
      if (provider === 'anthropic' && key === 'messages') {
        return wrapMethodsProxy(original, provider, state, ['create']);
      }

      // For top-level methods (Google, Vercel AI)
      if (typeof original === 'function') {
        return wrapFunction(original.bind(target) as (...args: unknown[]) => unknown, provider, key, state);
      }

      return original;
    },
  });
};

const wrapNestedProxy = (
  obj: object,
  provider: string,
  state: PipelineState,
  nestedKeys: readonly string[],
  methodKeys: readonly string[],
): object => {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const key = String(prop);
      const original = Reflect.get(target, prop, receiver);

      if (nestedKeys.includes(key) && typeof original === 'object' && original !== null) {
        return wrapMethodsProxy(original as object, provider, state, methodKeys);
      }

      return original;
    },
  });
};

const wrapMethodsProxy = (
  obj: object,
  provider: string,
  state: PipelineState,
  methodKeys: readonly string[],
): object => {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const key = String(prop);
      const original = Reflect.get(target, prop, receiver);

      if (methodKeys.includes(key) && typeof original === 'function') {
        return wrapFunction(original.bind(target) as (...args: unknown[]) => unknown, provider, key, state);
      }

      return original;
    },
  });
};

const wrapFunction = (
  fn: (...args: unknown[]) => unknown,
  provider: string,
  method: string,
  state: PipelineState,
): ((...args: unknown[]) => unknown) => {
  return async (...args: unknown[]) => {
    const params = (args[0] ?? {}) as Record<string, unknown>;
    const { pipeline, config: currentConfig } = state; // Read at call time (hot-reload)

    const ctx: MiddlewareContext = {
      provider,
      method,
      config: currentConfig,
      params,
      metadata: {},
    };

    // Run pre-hooks (may throw for prohibited practices)
    const processedCtx = pipeline.runPre(ctx);

    // Call original API with retry for transient errors
    const response = await withRetry(
      () => fn(processedCtx.params) as Promise<unknown>,
      currentConfig.retry,
    );

    // Streaming: yield chunks as-is, run post-hooks after stream ends
    if (isStreamResponse(response)) {
      return wrapStream(response, processedCtx, pipeline);
    }

    // Run post-hooks
    const result = await pipeline.runPost(processedCtx, response);
    attachMetadata(result);

    return result.response;
  };
};

// Re-export for domain middleware (Step 5)
export { createPipeline } from './pipeline.js';
