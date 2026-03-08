import type { PreHook } from '../../types.js';
import { PermissionDeniedError } from '../../errors.js';

/**
 * C.R12: Check if LLM API method is permitted by passport.
 *
 * Checks `denied` list and `prohibited_actions` against the API method name
 * (e.g. "create" for OpenAI chat.completions.create).
 *
 * Note: `permissions.tools` is reserved for tool_call validation in the
 * post-hook (permission-tool-calls.ts, US-S05-03). It controls which tools
 * the LLM is allowed to invoke, not which API methods can be called.
 */
export const createPermissionHook = (passport: {
  permissions: { denied: readonly string[] };
  constraints: { prohibited_actions: readonly string[] };
}): PreHook => (ctx) => {
  const method = ctx.method;

  // Check denied list
  if (passport.permissions.denied.includes(method)) {
    throw new PermissionDeniedError(
      `Method "${method}" is denied by agent passport`,
      method,
    );
  }

  // Check prohibited actions
  if (passport.constraints.prohibited_actions.includes(method)) {
    throw new PermissionDeniedError(
      `Method "${method}" is a prohibited action for this agent`,
      method,
    );
  }

  return ctx;
};
