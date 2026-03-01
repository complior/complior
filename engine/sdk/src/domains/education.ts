import type { DomainHooks, PreHook, PostHook } from '../types.js';

const minorsProtectionHook: PreHook = (ctx) => {
  return {
    ...ctx,
    metadata: { ...ctx.metadata, minorsProtection: true },
  };
};

const admissionsBiasHook: PreHook = (ctx) => {
  return {
    ...ctx,
    metadata: { ...ctx.metadata, admissionsBiasGuard: true },
  };
};

const contentSafetyHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: { ...ctx.metadata, contentSafetyChecked: true, domain: 'education' },
    headers: { 'X-Domain': 'education', 'X-Content-Safety': 'enabled' },
  };
};

const proctoringBlockHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: { ...ctx.metadata, proctoringBlock: true },
    headers: {},
  };
};

export const educationHooks: DomainHooks = {
  pre: [minorsProtectionHook, admissionsBiasHook],
  post: [contentSafetyHook, proctoringBlockHook],
};
