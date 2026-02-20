import type { PostHook } from '../types.js';

/** OBL-021: Standard compliance headers */
export const headersHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: ctx.metadata,
    headers: {
      'X-AI-Disclosure': 'true',
      'X-AI-Provider': ctx.provider,
      'X-Content-Marking': ctx.metadata['c2pa'] ? 'c2pa' : 'none',
    },
  };
};
