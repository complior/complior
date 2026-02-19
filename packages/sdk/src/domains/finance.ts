import type { DomainHooks, PreHook, PostHook } from '../types.js';
import { DomainViolationError } from '../errors.js';

const friaCheckHook: PreHook = (ctx) => {
  const messages = ctx.params['messages'] as { role: string; content: string }[] | undefined;
  if (!messages) return ctx;

  const text = messages.map((m) => m.content).join(' ');
  if (/credit\s*scor(e|ing)/i.test(text)) {
    throw new DomainViolationError(
      'Credit scoring requires a Fundamental Rights Impact Assessment (FRIA)',
      'finance',
      'OBL-009',
    );
  }
  return ctx;
};

const creditScoringGuardHook: PreHook = (ctx) => {
  return {
    ...ctx,
    metadata: { ...ctx.metadata, friaRequired: true },
  };
};

const explainabilityHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: { ...ctx.metadata, explainabilityRequired: true, domain: 'finance' },
    headers: { 'X-Domain': 'finance', 'X-Explainability': 'required' },
  };
};

const auditTrailHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: {
      ...ctx.metadata,
      auditTrail: {
        timestamp: new Date().toISOString(),
        provider: ctx.provider,
        method: ctx.method,
      },
    },
    headers: {},
  };
};

export const financeHooks: DomainHooks = {
  pre: [friaCheckHook, creditScoringGuardHook],
  post: [explainabilityHook, auditTrailHook],
};
