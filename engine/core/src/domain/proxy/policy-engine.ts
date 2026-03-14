import { z } from 'zod';

export const PolicyRuleSchema = z.object({
  name: z.string(),
  action: z.enum(['allow', 'deny']),
  tool: z.string().optional(),
  tool_pattern: z.string().optional(),
  arg_pattern: z.record(z.string()).optional(),
  rate_limit: z.object({
    max_calls: z.number().int().min(1),
    window_seconds: z.number().int().min(1),
  }).optional(),
  reason: z.string().optional(),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const ProxyPolicySchema = z.object({
  version: z.literal('1.0'),
  default_action: z.enum(['allow', 'deny']),
  rules: z.array(PolicyRuleSchema),
});

export type ProxyPolicy = z.infer<typeof ProxyPolicySchema>;

export interface PolicyDecision {
  readonly allowed: boolean;
  readonly rule?: string;
  readonly reason?: string;
}

interface RateLimitState {
  readonly timestamps: number[];
}

export interface PolicyEngine {
  readonly evaluate: (toolName: string, args?: Record<string, unknown>) => PolicyDecision;
}

export const createPolicyEngine = (policy: ProxyPolicy): PolicyEngine => {
  // Rate limit tracking: rule name -> list of call timestamps
  const rateLimitState = new Map<string, RateLimitState>();

  const matchesTool = (rule: PolicyRule, toolName: string): boolean => {
    if (rule.tool && rule.tool === toolName) return true;
    if (rule.tool_pattern) {
      try {
        return new RegExp(rule.tool_pattern).test(toolName);
      } catch {
        return false;
      }
    }
    // If neither tool nor tool_pattern specified, matches all tools
    if (!rule.tool && !rule.tool_pattern) return true;
    return false;
  };

  const matchesArgs = (rule: PolicyRule, args?: Record<string, unknown>): boolean => {
    if (!rule.arg_pattern) return true; // No arg pattern = matches all
    if (!args) return false; // Has arg pattern but no args = no match

    for (const [key, pattern] of Object.entries(rule.arg_pattern)) {
      const argValue = args[key];
      if (argValue === undefined) return false;
      try {
        if (!new RegExp(pattern).test(String(argValue))) return false;
      } catch {
        return false;
      }
    }
    return true;
  };

  const checkRateLimit = (rule: PolicyRule): boolean => {
    if (!rule.rate_limit) return true; // No rate limit = OK

    const now = Date.now();
    const windowMs = rule.rate_limit.window_seconds * 1000;
    const key = rule.name;

    if (!rateLimitState.has(key)) {
      rateLimitState.set(key, { timestamps: [] });
    }

    const state = rateLimitState.get(key);
    if (!state) return true;
    // Clean old entries (sliding window)
    const validTimestamps = state.timestamps.filter(t => now - t < windowMs);

    if (validTimestamps.length >= rule.rate_limit.max_calls) {
      return false; // Rate limited
    }

    // Record this call
    validTimestamps.push(now);
    rateLimitState.set(key, { timestamps: validTimestamps });
    return true;
  };

  const evaluate = (toolName: string, args?: Record<string, unknown>): PolicyDecision => {
    // First-match-wins evaluation
    for (const rule of policy.rules) {
      if (!matchesTool(rule, toolName)) continue;
      if (!matchesArgs(rule, args)) continue;

      // Tool and args match this rule
      if (rule.action === 'deny') {
        return {
          allowed: false,
          rule: rule.name,
          reason: rule.reason ?? `Denied by rule: ${rule.name}`,
        };
      }

      // Allow rule — check rate limit
      if (rule.rate_limit) {
        if (!checkRateLimit(rule)) {
          return {
            allowed: false,
            rule: rule.name,
            reason: `Rate limit exceeded for rule: ${rule.name} (max ${rule.rate_limit.max_calls} calls per ${rule.rate_limit.window_seconds}s)`,
          };
        }
      }

      return { allowed: true, rule: rule.name };
    }

    // No rule matched — use default action
    return {
      allowed: policy.default_action === 'allow',
      reason: policy.default_action === 'deny' ? 'No matching rule; default policy is deny' : undefined,
    };
  };

  return Object.freeze({ evaluate });
};
