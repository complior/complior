import type { PreHook } from '../types.js';
import { PermissionDeniedError } from '../errors.js';
import type { AgentPassport } from '../agent.js';

/** C.R12: Check if method/tool is permitted by passport */
export const createPermissionHook = (passport: AgentPassport): PreHook => (ctx) => {
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

  // If tools list is non-empty, treat it as an allowlist
  if (passport.permissions.tools.length > 0 && !passport.permissions.tools.includes(method)) {
    throw new PermissionDeniedError(
      `Method "${method}" is not in agent's allowed tools`,
      method,
    );
  }

  return ctx;
};
