import { describe, it, expect, vi } from 'vitest';
import { createToolCallPermissionHook } from '../post/permission-tool-calls.js';
import type { DeniedToolCall } from '../post/permission-tool-calls.js';
import { PermissionDeniedError } from '../errors.js';
import type { AgentPassport } from '../agent.js';
import type { MiddlewareContext } from '../types.js';

const makeCtx = (metadata: Record<string, unknown> = {}): MiddlewareContext => ({
  provider: 'openai',
  method: 'create',
  config: { jurisdictions: ['EU'] },
  params: {},
  metadata,
});

const createPassport = (overrides?: Partial<AgentPassport>): AgentPassport => ({
  permissions: { tools: [], denied: [] },
  constraints: {
    rate_limits: { max_actions_per_minute: 60 },
    budget: { max_cost_per_session_usd: 10 },
    prohibited_actions: [],
  },
  ...overrides,
});

// --- Response factories ---

const openaiToolCallResponse = (toolCalls: { name: string; args?: Record<string, unknown> }[]) => ({
  choices: [{
    message: {
      tool_calls: toolCalls.map((tc, i) => ({
        id: `call_${i}`,
        type: 'function',
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.args ?? {}),
        },
      })),
    },
  }],
});

const anthropicToolCallResponse = (toolCalls: { name: string; input?: Record<string, unknown> }[]) => ({
  content: toolCalls.map((tc, i) => ({
    type: 'tool_use',
    id: `toolu_${i}`,
    name: tc.name,
    input: tc.input ?? {},
  })),
});

const googleToolCallResponse = (toolCalls: { name: string; args?: Record<string, unknown> }[]) => ({
  candidates: [{
    content: {
      parts: toolCalls.map((tc) => ({
        functionCall: { name: tc.name, args: tc.args ?? {} },
      })),
    },
  }],
});

describe('createToolCallPermissionHook', () => {
  // ── No tool_calls in response ──────────────────────────────────

  describe('no tool_calls', () => {
    it('passes through response with no tool_calls', () => {
      const hook = createToolCallPermissionHook({ passport: createPassport() });
      const response = { choices: [{ message: { content: 'Hello!' } }] };
      const result = hook(makeCtx(), response);
      expect(result.response).toBe(response);
      expect(result.metadata['toolCallsChecked']).toBe(0);
    });
  });

  // ── Allowlist enforcement ──────────────────────────────────────

  describe('allowlist (passport.permissions.tools)', () => {
    it('allows tool_calls when allowlist is empty (no restriction)', () => {
      const hook = createToolCallPermissionHook({
        passport: createPassport({ permissions: { tools: [], denied: [] } }),
      });
      const response = openaiToolCallResponse([{ name: 'any_tool' }]);
      const result = hook(makeCtx(), response);
      expect(result.metadata['toolCallsDenied']).toEqual([]);
      expect(result.metadata['toolCallsAllowed']).toEqual(['any_tool']);
    });

    it('allows tool_calls that are in the allowlist', () => {
      const hook = createToolCallPermissionHook({
        passport: createPassport({ permissions: { tools: ['search', 'read_file'], denied: [] } }),
      });
      const response = openaiToolCallResponse([{ name: 'search' }]);
      const result = hook(makeCtx(), response);
      expect(result.metadata['toolCallsDenied']).toEqual([]);
    });

    it('blocks tool_calls not in the allowlist (action=block)', () => {
      const hook = createToolCallPermissionHook({
        passport: createPassport({ permissions: { tools: ['search', 'read_file'], denied: [] } }),
        action: 'block',
      });
      const response = openaiToolCallResponse([{ name: 'delete_database' }]);

      expect(() => hook(makeCtx(), response)).toThrow(PermissionDeniedError);
    });

    it('warns but does not block when action=warn', () => {
      const hook = createToolCallPermissionHook({
        passport: createPassport({ permissions: { tools: ['search'], denied: [] } }),
        action: 'warn',
      });
      const response = openaiToolCallResponse([{ name: 'unauthorized_tool' }]);
      const result = hook(makeCtx(), response);
      expect(result.metadata['toolCallsDenied']).toEqual(['unauthorized_tool']);
      expect(result.headers['X-Tool-Permission-Warning']).toBe('unauthorized_tool');
    });

    it('logs only when action=log-only', () => {
      const hook = createToolCallPermissionHook({
        passport: createPassport({ permissions: { tools: ['search'], denied: [] } }),
        action: 'log-only',
      });
      const response = openaiToolCallResponse([{ name: 'some_tool' }]);
      const result = hook(makeCtx(), response);
      expect(result.metadata['toolCallsDenied']).toEqual(['some_tool']);
      expect(result.response).toBe(response);
    });
  });

  // ── Denylist enforcement ───────────────────────────────────────

  describe('denylist (passport.permissions.denied)', () => {
    it('blocks tool_calls in the denylist', () => {
      const hook = createToolCallPermissionHook({
        passport: createPassport({ permissions: { tools: [], denied: ['rm_rf', 'drop_table'] } }),
      });
      const response = openaiToolCallResponse([{ name: 'rm_rf' }]);

      expect(() => hook(makeCtx(), response)).toThrow(PermissionDeniedError);
    });

    it('denylist takes priority over allowlist', () => {
      const hook = createToolCallPermissionHook({
        passport: createPassport({
          permissions: { tools: ['search', 'dangerous_tool'], denied: ['dangerous_tool'] },
        }),
      });
      const response = openaiToolCallResponse([{ name: 'dangerous_tool' }]);

      expect(() => hook(makeCtx(), response)).toThrow(PermissionDeniedError);
    });
  });

  // ── Multi-provider support ─────────────────────────────────────

  describe('multi-provider', () => {
    it('blocks denied tool_calls in Anthropic format', () => {
      const hook = createToolCallPermissionHook({
        passport: createPassport({ permissions: { tools: ['search'], denied: [] } }),
      });
      const response = anthropicToolCallResponse([{ name: 'exec_code' }]);

      expect(() => hook(makeCtx(), response)).toThrow(PermissionDeniedError);
    });

    it('blocks denied tool_calls in Google Gemini format', () => {
      const hook = createToolCallPermissionHook({
        passport: createPassport({ permissions: { tools: ['search'], denied: [] } }),
      });
      const response = googleToolCallResponse([{ name: 'send_email' }]);

      expect(() => hook(makeCtx(), response)).toThrow(PermissionDeniedError);
    });

    it('allows valid tool_calls in Anthropic format', () => {
      const hook = createToolCallPermissionHook({
        passport: createPassport({ permissions: { tools: ['get_weather'], denied: [] } }),
      });
      const response = anthropicToolCallResponse([{ name: 'get_weather', input: { city: 'Berlin' } }]);
      const result = hook(makeCtx(), response);
      expect(result.metadata['toolCallsDenied']).toEqual([]);
    });
  });

  // ── onDenied callback ──────────────────────────────────────────

  describe('onDenied callback', () => {
    it('calls onDenied with denied tool details', () => {
      const deniedLog: DeniedToolCall[][] = [];
      const hook = createToolCallPermissionHook({
        passport: createPassport({ permissions: { tools: ['search'], denied: [] } }),
        action: 'warn',
        onDenied: (d) => deniedLog.push(d),
      });
      const response = openaiToolCallResponse([{ name: 'hack_system' }]);
      hook(makeCtx(), response);

      expect(deniedLog).toHaveLength(1);
      expect(deniedLog[0]![0]!.toolName).toBe('hack_system');
      expect(deniedLog[0]![0]!.reason).toBe('not-in-allowlist');
      expect(deniedLog[0]![0]!.agentProvider).toBe('openai');
    });

    it('does not call onDenied when all tools are allowed', () => {
      const onDenied = vi.fn();
      const hook = createToolCallPermissionHook({
        passport: createPassport(),
        onDenied,
      });
      const response = openaiToolCallResponse([{ name: 'anything' }]);
      hook(makeCtx(), response);
      expect(onDenied).not.toHaveBeenCalled();
    });
  });

  // ── Mixed allowed/denied ───────────────────────────────────────

  describe('mixed tool_calls', () => {
    it('identifies both allowed and denied in same response', () => {
      const hook = createToolCallPermissionHook({
        passport: createPassport({ permissions: { tools: ['search', 'read'], denied: [] } }),
        action: 'warn',
      });
      const response = openaiToolCallResponse([
        { name: 'search' },
        { name: 'delete_all' },
        { name: 'read' },
      ]);
      const result = hook(makeCtx(), response);
      expect(result.metadata['toolCallsChecked']).toBe(3);
      expect(result.metadata['toolCallsDenied']).toEqual(['delete_all']);
      expect(result.metadata['toolCallsAllowed']).toEqual(['search', 'read']);
    });
  });

  // ── Integration with compliorAgent ─────────────────────────────

  describe('default action is block', () => {
    it('defaults to block when no action specified', () => {
      const hook = createToolCallPermissionHook({
        passport: createPassport({ permissions: { tools: ['only_this'], denied: [] } }),
      });
      const response = openaiToolCallResponse([{ name: 'not_this' }]);

      expect(() => hook(makeCtx(), response)).toThrow(PermissionDeniedError);
    });
  });
});
