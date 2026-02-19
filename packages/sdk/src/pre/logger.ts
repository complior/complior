import type { PreHook } from '../types.js';

/** OBL-006: Input logging with timestamp */
export const loggerHook: PreHook = (ctx) => {
  return {
    ...ctx,
    metadata: {
      ...ctx.metadata,
      loggedAt: new Date().toISOString(),
      provider: ctx.provider,
      method: ctx.method,
    },
  };
};
