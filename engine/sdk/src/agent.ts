import type { MiddlewareConfig, DomainHooks, PreHook, PostHook } from './types.js';
import { complior } from './index.js';
import { createPermissionHook } from './hooks/pre/permission.js';
import { createRateLimitHook } from './hooks/pre/rate-limit.js';
import { createBudgetHook } from './hooks/post/budget.js';
import { createActionLogHook } from './hooks/post/action-log.js';
import type { ActionLogEntry } from './hooks/post/action-log.js';
import { createCircuitBreakerHook } from './hooks/post/circuit-breaker.js';
import type { CircuitBreakerConfig } from './hooks/post/circuit-breaker.js';
import { createToolCallPermissionHook } from './hooks/post/permission-tool-calls.js';
import type { ToolCallAction, DeniedToolCall } from './hooks/post/permission-tool-calls.js';

// --- Internal passport field access ---
// Engine validates passport on disk; SDK trusts the shape at runtime.

const asPermissions = (p: Record<string, unknown>) =>
  (p.permissions ?? {}) as { tools?: readonly string[]; denied?: readonly string[] };
const asConstraints = (p: Record<string, unknown>) =>
  (p.constraints ?? {}) as {
    rate_limits?: { max_actions_per_minute?: number };
    budget?: { max_cost_per_session_usd?: number };
    prohibited_actions?: readonly string[];
  };

// --- Config ---

export interface AgentConfig extends MiddlewareConfig {
  readonly passport: Record<string, unknown>;
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
  const perms = asPermissions(config.passport);
  const cons = asConstraints(config.passport);
  agentPreHooks.push(createPermissionHook({
    permissions: { denied: perms.denied ?? [] },
    constraints: { prohibited_actions: cons.prohibited_actions ?? [] },
  }));

  // Rate limiting (pre-hook)
  const maxPerMinute = cons.rate_limits?.max_actions_per_minute ?? 0;
  if (maxPerMinute > 0) {
    agentPreHooks.push(createRateLimitHook(maxPerMinute));
  }

  // Tool-call permission enforcement (post-hook — validates tool_calls in response)
  agentPostHooks.push(createToolCallPermissionHook({
    passport: {
      permissions: { tools: perms.tools ?? [], denied: perms.denied ?? [] },
    },
    action: config.toolCallAction ?? 'block',
    onDenied: config.onToolCallDenied,
  }));

  // Circuit breaker (post-hook — runs after tool-call check, before budget)
  if (config.circuitBreaker) {
    agentPostHooks.push(createCircuitBreakerHook(config.circuitBreaker));
  }

  // Budget tracking (post-hook)
  const budgetLimit = config.budgetLimitUsd
    ?? cons.budget?.max_cost_per_session_usd ?? 0;
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
