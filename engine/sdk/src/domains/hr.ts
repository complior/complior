import type { DomainHooks, PreHook, PostHook } from '../types.js';
import { DomainViolationError } from '../errors.js';

const emotionBlockHook: PreHook = (ctx) => {
  const messages = ctx.params['messages'] as { role: string; content: string }[] | undefined;
  if (!messages) return ctx;

  const text = messages.map((m) => m.content).join(' ');
  if (/emotion\s*(recognition|detection|analysis)/i.test(text)) {
    throw new DomainViolationError(
      'Emotion recognition is prohibited in HR contexts (EU AI Act Art. 5)',
      'hr',
      'OBL-002',
    );
  }
  return ctx;
};

const worksCouncilHook: PreHook = (ctx) => {
  return {
    ...ctx,
    metadata: { ...ctx.metadata, worksCouncilNotice: true },
  };
};

const fairnessMetricsHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: { ...ctx.metadata, fairnessAudit: 'required', domain: 'hr' },
    headers: { 'X-Domain': 'hr', 'X-Fairness-Audit': 'required' },
  };
};

const protectedCharacteristicsHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: { ...ctx.metadata, protectedCharacteristicsGuard: true },
    headers: {},
  };
};

export const hrHooks: DomainHooks = {
  pre: [emotionBlockHook, worksCouncilHook],
  post: [fairnessMetricsHook, protectedCharacteristicsHook],
};
