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
    const budgetMeta: unknown = ctx.metadata['budget'];
    const cost = (budgetMeta && typeof budgetMeta === 'object' && 'callCost' in budgetMeta
      && typeof budgetMeta.callCost === 'number')
      ? budgetMeta.callCost
      : 0;

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
