import type { MiddlewareConfig, DomainHooks, PreHook, PostHook } from './types.js';
import { complior } from './index.js';
import { createPermissionHook } from './pre/permission.js';
import { createRateLimitHook } from './pre/rate-limit.js';
import { createBudgetHook } from './post/budget.js';
import { createActionLogHook } from './post/action-log.js';
import type { ActionLogEntry } from './post/action-log.js';
import { createCircuitBreakerHook } from './post/circuit-breaker.js';
import type { CircuitBreakerConfig } from './post/circuit-breaker.js';
import { createToolCallPermissionHook } from './post/permission-tool-calls.js';
import type { ToolCallAction, DeniedToolCall } from './post/permission-tool-calls.js';

// --- Passport shape (subset of AgentManifest used by SDK) ---

export interface AgentPassport {
  readonly permissions: {
    readonly tools: readonly string[];
    readonly denied: readonly string[];
  };
  readonly constraints: {
    readonly rate_limits: { readonly max_actions_per_minute: number };
    readonly budget: { readonly max_cost_per_session_usd: number };
    readonly prohibited_actions: readonly string[];
  };
}

// --- Config ---

export interface AgentConfig extends MiddlewareConfig {
  readonly passport: AgentPassport;
  readonly budgetLimitUsd?: number;
  readonly onBudgetExceeded?: 'warn' | 'block';
  readonly onPermissionDenied?: 'warn' | 'block';
  readonly toolCallAction?: ToolCallAction;
  readonly onToolCallDenied?: (denied: DeniedToolCall[]) => void;
  readonly onAction?: (entry: ActionLogEntry) => void;
  readonly circuitBreaker?: CircuitBreakerConfig;
}

// --- Factory ---

/**
 * Wrap an LLM client with agent-aware compliance middleware.
 *
 * Extends base `complior()` with passport-based permission enforcement,
 * rate limiting, budget tracking, and action logging.
 *
 * @example
 * ```ts
 * import OpenAI from 'openai';
 * import { compliorAgent } from '@complior/sdk';
 *
 * const passport = JSON.parse(fs.readFileSync('.complior/agents/my-bot-manifest.json', 'utf-8'));
 * const openai = compliorAgent(new OpenAI(), {
 *   jurisdictions: ['EU'],
 *   passport,
 *   budgetLimitUsd: 10,
 *   onAction: (entry) => console.log('LLM call:', entry),
 * });
 * ```
 */
export const compliorAgent = <T extends object>(
  client: T,
  config: AgentConfig,
  domainHooks?: DomainHooks,
): T => {
  const agentPreHooks: PreHook[] = [];
  const agentPostHooks: PostHook[] = [];

  // Permission enforcement (pre-hook)
  agentPreHooks.push(createPermissionHook(config.passport));

  // Rate limiting (pre-hook)
  const maxPerMinute = config.passport.constraints.rate_limits.max_actions_per_minute;
  if (maxPerMinute > 0) {
    agentPreHooks.push(createRateLimitHook(maxPerMinute));
  }

  // Tool-call permission enforcement (post-hook — validates tool_calls in response)
  agentPostHooks.push(createToolCallPermissionHook({
    passport: config.passport,
    action: config.toolCallAction ?? 'block',
    onDenied: config.onToolCallDenied,
  }));

  // Circuit breaker (post-hook — runs after tool-call check, before budget)
  if (config.circuitBreaker) {
    agentPostHooks.push(createCircuitBreakerHook(config.circuitBreaker));
  }

  // Budget tracking (post-hook)
  const budgetLimit = config.budgetLimitUsd
    ?? config.passport.constraints.budget.max_cost_per_session_usd;
  if (budgetLimit > 0) {
    agentPostHooks.push(createBudgetHook(budgetLimit, config.onBudgetExceeded ?? 'block'));
  }

  // Action logging (post-hook)
  if (config.onAction) {
    agentPostHooks.push(createActionLogHook(config.onAction));
  }

  // Merge agent hooks with optional domain hooks
  const mergedHooks: DomainHooks = {
    pre: domainHooks ? [...agentPreHooks, ...domainHooks.pre] : agentPreHooks,
    post: domainHooks ? [...domainHooks.post, ...agentPostHooks] : agentPostHooks,
  };

  return complior(client, config, mergedHooks);
};
