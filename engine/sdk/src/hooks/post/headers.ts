import type { PostHook } from '../../types.js';

/** OBL-021: Standard compliance headers */
export const headersHook: PostHook = (ctx, response) => {
  const disclosureVerified = ctx.metadata['disclosureVerified'];
  const disclosureHeader = disclosureVerified === true ? 'verified'
    : disclosureVerified === false ? 'missing'
    : 'true';

  return {
    response,
    metadata: ctx.metadata,
    headers: {
      'X-AI-Disclosure': disclosureHeader,
      'X-AI-Provider': ctx.provider,
      'X-Content-Marking': ctx.metadata['c2pa'] ? 'c2pa' : 'none',
    },
  };
};
