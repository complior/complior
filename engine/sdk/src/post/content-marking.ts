import type { PostHook } from '../types.js';

/** OBL-016: Add C2PA metadata marker to response */
export const contentMarkingHook: PostHook = (ctx, response) => {
  return {
    response,
    metadata: {
      ...ctx.metadata,
      c2pa: {
        producer: '@complior/sdk',
        timestamp: new Date().toISOString(),
        provider: ctx.provider,
      },
    },
    headers: { 'X-Content-Marking': 'c2pa' },
  };
};
