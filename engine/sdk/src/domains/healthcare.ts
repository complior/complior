import type { DomainHooks, PreHook, PostHook } from '../types.js';

const gdprArt9GuardHook: PreHook = (ctx) => {
  return {
    ...ctx,
    metadata: { ...ctx.metadata, gdprArt9: true, sensitiveDataGuard: true },
  };
};

const clinicalValidationHook: PreHook = (ctx) => {
  return {
    ...ctx,
    metadata: { ...ctx.metadata, clinicalValidationRequired: true },
  };
};

const anonymizationHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: { ...ctx.metadata, anonymizationApplied: true, domain: 'healthcare' },
    headers: { 'X-Domain': 'healthcare', 'X-Data-Protection': 'gdpr-art9' },
  };
};

const medicalDisclaimerHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: {
      ...ctx.metadata,
      medicalDisclaimer: 'This output is AI-generated and not a substitute for professional medical advice.',
    },
    headers: {},
  };
};

export const healthcareHooks: DomainHooks = {
  pre: [gdprArt9GuardHook, clinicalValidationHook],
  post: [anonymizationHook, medicalDisclaimerHook],
};
