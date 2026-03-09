import type { MiddlewareConfig, MiddlewareContext, MiddlewareResult, PreHook, PostHook, DomainHooks } from './types.js';
import { disclosureHook } from './hooks/pre/disclosure.js';
import { prohibitedHook } from './hooks/pre/prohibited.js';
import { sanitizeHook } from './hooks/pre/sanitize.js';
import { loggerHook } from './hooks/pre/logger.js';
import { disclosureVerifyHook } from './hooks/post/disclosure-verify.js';
import { contentMarkingHook } from './hooks/post/content-marking.js';
import { escalationHook } from './hooks/post/escalation.js';
import { headersHook } from './hooks/post/headers.js';
import { biasCheckHook } from './hooks/post/bias-check.js';
import { safetyFilterHook } from './hooks/post/safety-filter.js';
import { createDisclosureInjectorHook } from './runtime/disclosure-injector.js';
import { createInteractionLoggerHook } from './runtime/interaction-logger.js';
import { createHitlGateHook } from './runtime/hitl-gate.js';

export interface Pipeline {
  readonly runPre: (ctx: MiddlewareContext) => MiddlewareContext;
  readonly runPost: (ctx: MiddlewareContext, response: unknown) => Promise<MiddlewareResult>;
}

const BASE_PRE_HOOKS: readonly PreHook[] = [
  loggerHook,
  prohibitedHook,
  sanitizeHook,
  disclosureHook,
];

export const createPipeline = (
  config: MiddlewareConfig,
  domainHooks?: DomainHooks,
): Pipeline => {
  const preHooks = domainHooks
    ? [...BASE_PRE_HOOKS, ...domainHooks.pre]
    : [...BASE_PRE_HOOKS];

  const basePost: PostHook[] = [
    disclosureVerifyHook,
    ...(config.disclosureInjection ? [createDisclosureInjectorHook(config)] : []),
    contentMarkingHook,
    safetyFilterHook,
    escalationHook,
    biasCheckHook,
    ...(config.hitlGate ? [createHitlGateHook(config)] : []),
    ...(config.interactionLogger ? [createInteractionLoggerHook(config)] : []),
    headersHook,
  ];

  const postHooks = domainHooks
    ? [...domainHooks.post, ...basePost]
    : [...basePost];

  const runPre = (ctx: MiddlewareContext): MiddlewareContext => {
    let current = ctx;
    for (const hook of preHooks) {
      current = hook(current);
    }
    return current;
  };

  const runPost = async (ctx: MiddlewareContext, response: unknown): Promise<MiddlewareResult> => {
    let result: MiddlewareResult = {
      response,
      metadata: ctx.metadata,
      headers: {},
    };
    for (const hook of postHooks) {
      const hookResult = await hook(
        { ...ctx, metadata: result.metadata },
        result.response,
      );
      result = {
        response: hookResult.response,
        metadata: { ...result.metadata, ...hookResult.metadata },
        headers: { ...result.headers, ...hookResult.headers },
      };
    }
    return result;
  };

  return Object.freeze({ runPre, runPost });
};
