import type { DomainHooks, PreHook, PostHook } from '../types.js';

const deepfakeLabelingHook: PreHook = (ctx) => {
  return {
    ...ctx,
    metadata: { ...ctx.metadata, deepfakeLabeling: true },
  };
};

const sourceAttributionHook: PreHook = (ctx) => {
  return {
    ...ctx,
    metadata: { ...ctx.metadata, sourceAttribution: true },
  };
};

const c2paEnforcementHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: {
      ...ctx.metadata,
      c2paEnforced: true,
      domain: 'content',
    },
    headers: { 'X-Domain': 'content', 'X-Content-Marking': 'c2pa-enforced' },
  };
};

const watermarkHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: { ...ctx.metadata, watermarkApplied: true },
    headers: {},
  };
};

export const contentHooks: DomainHooks = {
  pre: [deepfakeLabelingHook, sourceAttributionHook],
  post: [c2paEnforcementHook, watermarkHook],
};
