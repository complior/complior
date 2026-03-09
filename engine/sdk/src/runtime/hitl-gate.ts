/**
 * US-S05-17: Human-in-the-Loop Gate (OBL-008/024, Art.14).
 *
 * Async PostHook factory — requires human approval for critical AI actions.
 * Default timeout: 5 minutes. No callback → auto-deny (fail-safe Art.14).
 */
import type { MiddlewareConfig, PostHook, GateRule, GateRequest, GateDecision } from '../types.js';
import { extractResponseText } from '../hooks/post/extract-response-text.js';
import { HumanGateDeniedError } from '../errors.js';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const DEFAULT_RULES: readonly GateRule[] = [
  { id: 'financial', description: 'Financial transaction or transfer', pattern: /\b(transfer|send|wire|pay|withdraw)\b.*\b(\$|€|£|USD|EUR|GBP|\d{3,})\b/i, category: 'financial' },
  { id: 'data_deletion', description: 'Data deletion or removal', pattern: /\b(delete|remove|drop|truncate|purge|destroy)\b.*\b(data|database|table|records?|users?|accounts?)\b/i, category: 'data_deletion' },
  { id: 'permission_change', description: 'Permission or access change', pattern: /\b(grant|revoke|change|modify|update)\b.*\b(permission|access|role|privilege|admin)\b/i, category: 'permission_change' },
  { id: 'safety_critical', description: 'Safety-critical system action', pattern: /\b(deploy|release|shutdown|restart|disable)\b.*\b(production|live|critical|safety|system)\b/i, category: 'safety_critical' },
];

const findMatchingRule = (text: string, rules: readonly GateRule[]): { rule: GateRule; matchedText: string } | null => {
  for (const rule of rules) {
    const match = rule.pattern.exec(text);
    if (match) {
      return { rule, matchedText: match[0] };
    }
  }
  return null;
};

export const createHitlGateHook = (config: MiddlewareConfig): PostHook => {
  const timeoutMs = config.hitlGateTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const rules = config.hitlGateRules ?? DEFAULT_RULES;
  const callback = config.onGateTriggered;

  return async (ctx, response) => {
    if (!config.hitlGate) {
      return { response, metadata: ctx.metadata, headers: {} };
    }

    const text = extractResponseText(response);
    if (!text) {
      return { response, metadata: ctx.metadata, headers: {} };
    }

    const matched = findMatchingRule(text, rules);
    if (!matched) {
      return { response, metadata: ctx.metadata, headers: {} };
    }

    const request: GateRequest = {
      rule: matched.rule,
      matchedText: matched.matchedText,
      provider: ctx.provider,
      method: ctx.method,
      timestamp: Date.now(),
    };

    // No callback → auto-deny (fail-safe Art.14)
    if (!callback) {
      throw new HumanGateDeniedError(
        `HITL gate denied: no callback configured for rule "${matched.rule.id}"`,
        'denied',
        matched.rule.id,
      );
    }

    // Race callback against timeout
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const decision: GateDecision = await Promise.race([
        callback(request),
        new Promise<GateDecision>((_, reject) => {
          timer = setTimeout(() => {
            reject(new HumanGateDeniedError(
              `HITL gate timed out after ${timeoutMs}ms for rule "${matched.rule.id}"`,
              'timeout',
              matched.rule.id,
              timeoutMs,
            ));
          }, timeoutMs);
        }),
      ]);

      if (!decision.approved) {
        const reason = 'reason' in decision ? decision.reason : undefined;
        throw new HumanGateDeniedError(
          `HITL gate denied by human for rule "${matched.rule.id}"${reason ? `: ${reason}` : ''}`,
          'denied',
          matched.rule.id,
        );
      }

      return {
        response,
        metadata: {
          ...ctx.metadata,
          hitlGateTriggered: true,
          hitlGateAction: matched.rule.id,
          hitlGateApproved: true,
          hitlGateCategory: matched.rule.category,
        },
        headers: {},
      };
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };
};
