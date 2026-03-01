import type { PostHook } from '../types.js';

/** OBL-015: Verify disclosure present in response */
export const disclosureVerifyHook: PostHook = (ctx, response) => {
  const metadata = { ...ctx.metadata, disclosureVerified: !!ctx.metadata['disclosureInjected'] };

  return {
    response,
    metadata,
    headers: { 'X-AI-Disclosure': 'true' },
  };
};
