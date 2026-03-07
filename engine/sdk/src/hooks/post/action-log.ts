import type { PostHook } from '../../types.js';

export interface ActionLogEntry {
  readonly provider: string;
  readonly method: string;
  readonly timestamp: string;
  readonly cost: number;
  readonly metadata: Record<string, unknown>;
}

/** C.R12: Log each LLM call via callback for audit trail */
export const createActionLogHook = (
  onAction: (entry: ActionLogEntry) => void,
): PostHook => {
  return (ctx, response) => {
    const cost = (ctx.metadata['budget'] as { callCost?: number } | undefined)?.callCost ?? 0;

    const entry: ActionLogEntry = {
      provider: ctx.provider,
      method: ctx.method,
      timestamp: new Date().toISOString(),
      cost,
      metadata: { ...ctx.metadata },
    };

    onAction(entry);

    return {
      response,
      metadata: {
        ...ctx.metadata,
        actionLogged: true,
      },
      headers: {},
    };
  };
};
