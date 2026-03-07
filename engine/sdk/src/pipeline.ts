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

export interface Pipeline {
  readonly runPre: (ctx: MiddlewareContext) => MiddlewareContext;
  readonly runPost: (ctx: MiddlewareContext, response: unknown) => MiddlewareResult;
}

const BASE_PRE_HOOKS: readonly PreHook[] = [
  loggerHook,
  prohibitedHook,
  sanitizeHook,
  disclosureHook,
];

const BASE_POST_HOOKS: readonly PostHook[] = [
  disclosureVerifyHook,
  contentMarkingHook,
  escalationHook,
  biasCheckHook,
  headersHook,
];

export const createPipeline = (
  _config: MiddlewareConfig,
  domainHooks?: DomainHooks,
): Pipeline => {
  const preHooks = domainHooks
    ? [...BASE_PRE_HOOKS, ...domainHooks.pre]
    : [...BASE_PRE_HOOKS];

  const postHooks = domainHooks
    ? [...domainHooks.post, ...BASE_POST_HOOKS]
    : [...BASE_POST_HOOKS];

  const runPre = (ctx: MiddlewareContext): MiddlewareContext => {
    let current = ctx;
    for (const hook of preHooks) {
      current = hook(current);
    }
    return current;
  };

  const runPost = (ctx: MiddlewareContext, response: unknown): MiddlewareResult => {
    let result: MiddlewareResult = {
      response,
      metadata: ctx.metadata,
      headers: {},
    };
    for (const hook of postHooks) {
      const hookResult = hook(
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
