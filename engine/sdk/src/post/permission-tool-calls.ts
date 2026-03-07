/**
 * US-S05-03: Permission Hook — parses tool_calls from LLM responses
 * and blocks invocations not in the passport allowlist or in the denylist.
 *
 * Post-hook: runs after LLM response, inspects tool_calls across
 * OpenAI, Anthropic, and Google Gemini response formats.
 */
import type { PostHook } from '../types.js';
import type { AgentPassport } from '../agent.js';
import { PermissionDeniedError } from '../errors.js';
import { parseToolCalls } from '../parsers/tool-call-parser.js';
import type { ParsedToolCall } from '../parsers/tool-call-parser.js';

export type ToolCallAction = 'block' | 'warn' | 'log-only';

export interface ToolCallPermissionConfig {
  readonly passport: AgentPassport;
  readonly action?: ToolCallAction;
  readonly onDenied?: (denied: DeniedToolCall[]) => void;
}

export interface DeniedToolCall {
  readonly toolName: string;
  readonly toolCallId: string;
  readonly reason: 'not-in-allowlist' | 'in-denylist';
  readonly timestamp: string;
  readonly agentProvider: string;
  readonly agentId?: string;
}

/**
 * Creates a post-hook that validates tool_calls in LLM responses
 * against the Agent Passport's permissions.
 */
export const createToolCallPermissionHook = (config: ToolCallPermissionConfig): PostHook => {
  const { passport, action = 'block', onDenied } = config;

  return (ctx, response) => {
    const toolCalls = parseToolCalls(response);

    if (toolCalls.length === 0) {
      return {
        response,
        metadata: { ...ctx.metadata, toolCallsChecked: 0, toolCallsDenied: [] },
        headers: {},
      };
    }

    const denied = checkPermissions(toolCalls, passport, ctx.provider);

    if (denied.length > 0) {
      onDenied?.(denied);
    }

    const metadata: Record<string, unknown> = {
      ...ctx.metadata,
      toolCallsChecked: toolCalls.length,
      toolCallsDenied: denied.map((d) => d.toolName),
      toolCallsAllowed: toolCalls
        .filter((tc) => !denied.some((d) => d.toolCallId === tc.id))
        .map((tc) => tc.name),
    };

    if (denied.length > 0 && action === 'block') {
      const names = denied.map((d) => d.toolName).join(', ');
      throw new PermissionDeniedError(
        `Tool call(s) denied by agent passport: ${names}`,
        names,
      );
    }

    const headers: Record<string, string> = {};
    if (denied.length > 0) {
      headers['X-Tool-Permission-Warning'] = denied.map((d) => d.toolName).join(',');
    }

    return { response, metadata, headers };
  };
};

const checkPermissions = (
  toolCalls: ParsedToolCall[],
  passport: AgentPassport,
  agentProvider: string,
): DeniedToolCall[] => {
  const denied: DeniedToolCall[] = [];
  const timestamp = new Date().toISOString();
  const allowlist = passport.permissions.tools;
  const denylist = passport.permissions.denied;

  for (const tc of toolCalls) {
    // Check denylist first (explicit deny takes priority)
    if (denylist.includes(tc.name)) {
      denied.push({
        toolName: tc.name,
        toolCallId: tc.id,
        reason: 'in-denylist',
        timestamp,
        agentProvider,
      });
      continue;
    }

    // If allowlist is non-empty, tool must be in it
    if (allowlist.length > 0 && !allowlist.includes(tc.name)) {
      denied.push({
        toolName: tc.name,
        toolCallId: tc.id,
        reason: 'not-in-allowlist',
        timestamp,
        agentProvider,
      });
    }
  }

  return denied;
};
