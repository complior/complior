import type { DomainHooks, PreHook, PostHook } from '../types.js';

const advisoryOnlyHook: PreHook = (ctx) => {
  return {
    ...ctx,
    metadata: { ...ctx.metadata, advisoryOnly: true },
  };
};

const disclaimerHook: PreHook = (ctx) => {
  return {
    ...ctx,
    metadata: {
      ...ctx.metadata,
      legalDisclaimer: 'AI-generated legal information. Not a substitute for qualified legal counsel.',
    },
  };
};

const humanReviewHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: { ...ctx.metadata, humanReviewRequired: true, domain: 'legal' },
    headers: { 'X-Domain': 'legal', 'X-Human-Review': 'required' },
  };
};

export const legalHooks: DomainHooks = {
  pre: [advisoryOnlyHook, disclaimerHook],
  post: [humanReviewHook],
};
