import { describe, it, expect, vi } from 'vitest';
import { createInterceptor } from './proxy-interceptor.js';
import { createPolicyEngine } from './policy-engine.js';
import type { JsonRpcRequest } from './json-rpc.js';

const makeToolCall = (name: string, args?: Record<string, unknown>): JsonRpcRequest => ({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: { name, arguments: args },
});

const makeListTools = (): JsonRpcRequest => ({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
});

describe('createInterceptor', () => {
  it('allows all requests by default', () => {
    const interceptor = createInterceptor({}, '2026-01-01T00:00:00Z');
    const result = interceptor.interceptRequest(makeToolCall('read_file'));
    expect(result.allow).toBe(true);
  });

  it('records tool calls', () => {
    const interceptor = createInterceptor({}, '2026-01-01T00:00:00Z');
    interceptor.recordCall(makeToolCall('read_file'), 50, true);
    const log = interceptor.getCallLog();
    expect(log.length).toBe(1);
    expect(log[0].method).toBe('tools/call');
    expect(log[0].toolName).toBe('read_file');
    expect(log[0].durationMs).toBe(50);
    expect(log[0].success).toBe(true);
  });

  it('tracks unique tools', () => {
    const interceptor = createInterceptor({}, '2026-01-01T00:00:00Z');
    interceptor.recordCall(makeToolCall('read_file'), 10, true);
    interceptor.recordCall(makeToolCall('write_file'), 20, true);
    interceptor.recordCall(makeToolCall('read_file'), 15, true);
    const stats = interceptor.getStats();
    expect(stats.uniqueTools).toHaveLength(2);
    expect(stats.uniqueTools).toContain('read_file');
    expect(stats.uniqueTools).toContain('write_file');
  });

  it('computes stats correctly', () => {
    const interceptor = createInterceptor({}, '2026-01-01T00:00:00Z');
    interceptor.recordCall(makeToolCall('a'), 100, true);
    interceptor.recordCall(makeToolCall('b'), 200, false, 'timeout');
    const stats = interceptor.getStats();
    expect(stats.totalCalls).toBe(2);
    expect(stats.successfulCalls).toBe(1);
    expect(stats.failedCalls).toBe(1);
    expect(stats.avgDurationMs).toBe(150);
    expect(stats.isRunning).toBe(true);
  });

  it('calls logCall callback', () => {
    const logCall = vi.fn();
    const interceptor = createInterceptor({ logCall }, '2026-01-01T00:00:00Z');
    interceptor.recordCall(makeToolCall('test'), 10, true);
    expect(logCall).toHaveBeenCalledTimes(1);
    expect(logCall.mock.calls[0][0].toolName).toBe('test');
  });

  it('calls recordEvidence callback for tool calls', () => {
    const recordEvidence = vi.fn();
    const interceptor = createInterceptor({ recordEvidence }, '2026-01-01T00:00:00Z');
    interceptor.recordCall(makeToolCall('read_file', { path: '/test' }), 10, true);
    expect(recordEvidence).toHaveBeenCalledTimes(1);
    expect(recordEvidence).toHaveBeenCalledWith('read_file', { path: '/test' });
  });

  it('does not call recordEvidence for non-tool methods', () => {
    const recordEvidence = vi.fn();
    const interceptor = createInterceptor({ recordEvidence }, '2026-01-01T00:00:00Z');
    interceptor.recordCall(makeListTools(), 10, true);
    expect(recordEvidence).not.toHaveBeenCalled();
  });

  it('enrichPassportFields returns observed tools', () => {
    const interceptor = createInterceptor({}, '2026-01-01T00:00:00Z');
    interceptor.recordCall(makeToolCall('read_file'), 10, true);
    interceptor.recordCall(makeToolCall('exec'), 20, true);
    const fields = interceptor.enrichPassportFields();
    expect(fields.tools_observed).toContain('read_file');
    expect(fields.tools_observed).toContain('exec');
    expect(fields.total_calls).toBe(2);
  });

  it('assigns sequential call IDs', () => {
    const interceptor = createInterceptor({}, '2026-01-01T00:00:00Z');
    interceptor.recordCall(makeToolCall('a'), 10, true);
    interceptor.recordCall(makeToolCall('b'), 10, true);
    const log = interceptor.getCallLog();
    expect(log[0].id).toBe('call-1');
    expect(log[1].id).toBe('call-2');
  });

  it('records error message on failed calls', () => {
    const interceptor = createInterceptor({}, '2026-01-01T00:00:00Z');
    interceptor.recordCall(makeToolCall('fail'), 10, false, 'Connection refused');
    const log = interceptor.getCallLog();
    expect(log[0].error).toBe('Connection refused');
  });

  it('getStats returns zero avg for empty log', () => {
    const interceptor = createInterceptor({}, '2026-01-01T00:00:00Z');
    const stats = interceptor.getStats();
    expect(stats.avgDurationMs).toBe(0);
    expect(stats.totalCalls).toBe(0);
  });

  it('startedAt is preserved in stats', () => {
    const interceptor = createInterceptor({}, '2026-03-13T12:00:00Z');
    expect(interceptor.getStats().startedAt).toBe('2026-03-13T12:00:00Z');
  });

  describe('with policy engine (US-S06-02)', () => {
    it('allows non-tool-call requests even with policy engine', () => {
      const policyEngine = createPolicyEngine({
        version: '1.0',
        default_action: 'deny',
        rules: [],
      });
      const interceptor = createInterceptor({ policyEngine }, '2026-01-01T00:00:00Z');
      const result = interceptor.interceptRequest(makeListTools());
      expect(result.allow).toBe(true);
    });

    it('denies tool calls when policy engine denies', () => {
      const policyEngine = createPolicyEngine({
        version: '1.0',
        default_action: 'deny',
        rules: [],
      });
      const interceptor = createInterceptor({ policyEngine }, '2026-01-01T00:00:00Z');
      const result = interceptor.interceptRequest(makeToolCall('dangerous_tool'));
      expect(result.allow).toBe(false);
    });

    it('allows tool calls when policy engine allows', () => {
      const policyEngine = createPolicyEngine({
        version: '1.0',
        default_action: 'allow',
        rules: [],
      });
      const interceptor = createInterceptor({ policyEngine }, '2026-01-01T00:00:00Z');
      const result = interceptor.interceptRequest(makeToolCall('safe_tool'));
      expect(result.allow).toBe(true);
    });

    it('passes args to policy engine for evaluation', () => {
      const policyEngine = createPolicyEngine({
        version: '1.0',
        default_action: 'allow',
        rules: [{
          name: 'no-etc',
          action: 'deny',
          tool: 'write_file',
          arg_pattern: { path: '^\\/etc\\/' },
          reason: 'Cannot write to /etc/',
        }],
      });
      const interceptor = createInterceptor({ policyEngine }, '2026-01-01T00:00:00Z');
      const denied = interceptor.interceptRequest(makeToolCall('write_file', { path: '/etc/passwd' }));
      expect(denied.allow).toBe(false);
      if (!denied.allow) {
        expect(denied.reason).toBe('Cannot write to /etc/');
      }

      const allowed = interceptor.interceptRequest(makeToolCall('write_file', { path: '/home/user/file' }));
      expect(allowed.allow).toBe(true);
    });

    it('allows all when no policy engine is provided', () => {
      const interceptor = createInterceptor({}, '2026-01-01T00:00:00Z');
      const result = interceptor.interceptRequest(makeToolCall('any_tool'));
      expect(result.allow).toBe(true);
    });
  });
});
