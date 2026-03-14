import type { McpCallLog, ProxyStats } from './proxy-types.js';
import type { JsonRpcRequest } from './json-rpc.js';
import type { PolicyEngine } from './policy-engine.js';

export interface InterceptorDeps {
  readonly logCall?: (log: McpCallLog) => void;
  readonly recordEvidence?: (toolName: string, args: unknown) => void;
  readonly policyEngine?: PolicyEngine;
}

export interface ProxyInterceptor {
  readonly interceptRequest: (req: JsonRpcRequest) => { allow: true } | { allow: false; reason: string };
  readonly recordCall: (req: JsonRpcRequest, durationMs: number, success: boolean, error?: string) => void;
  readonly getStats: () => ProxyStats;
  readonly getCallLog: () => readonly McpCallLog[];
  readonly enrichPassportFields: () => { tools_observed: readonly string[]; total_calls: number };
}

export const createInterceptor = (deps: InterceptorDeps, startedAt: string): ProxyInterceptor => {
  const callLog: McpCallLog[] = [];
  const toolsObserved = new Set<string>();
  let callCounter = 0;

  const asRecord = (val: unknown): Record<string, unknown> | undefined =>
    val !== null && typeof val === 'object' && !Array.isArray(val)
      ? val as Record<string, unknown>
      : undefined;

  const extractToolName = (req: JsonRpcRequest): string | undefined => {
    if (req.method !== 'tools/call') return undefined;
    const params = asRecord(req.params);
    const name = params?.name;
    return typeof name === 'string' ? name : undefined;
  };

  const extractArgs = (req: JsonRpcRequest): Record<string, unknown> | undefined => {
    if (req.method !== 'tools/call') return undefined;
    const params = asRecord(req.params);
    return asRecord(params?.arguments);
  };

  const interceptRequest = (req: JsonRpcRequest): { allow: true } | { allow: false; reason: string } => {
    // If not a tool call, always allow
    if (req.method !== 'tools/call') return { allow: true };

    // If no policy engine, allow all
    if (!deps.policyEngine) return { allow: true };

    const toolName = extractToolName(req);
    if (!toolName) return { allow: true };

    const args = extractArgs(req);
    const decision = deps.policyEngine.evaluate(toolName, args);

    if (!decision.allowed) {
      return { allow: false, reason: decision.reason ?? `Denied by policy rule: ${decision.rule}` };
    }

    return { allow: true };
  };

  const recordCall = (req: JsonRpcRequest, durationMs: number, success: boolean, error?: string): void => {
    callCounter++;
    const toolName = extractToolName(req);
    const args = extractArgs(req);

    if (toolName) toolsObserved.add(toolName);

    const log: McpCallLog = {
      id: `call-${callCounter}`,
      timestamp: new Date().toISOString(),
      method: req.method,
      toolName,
      args,
      durationMs,
      success,
      error,
    };

    callLog.push(log);
    deps.logCall?.(log);

    if (toolName) {
      deps.recordEvidence?.(toolName, args);
    }
  };

  const getStats = (): ProxyStats => {
    const successful = callLog.filter(c => c.success).length;
    const failed = callLog.filter(c => !c.success).length;
    const avgDuration = callLog.length > 0
      ? callLog.reduce((sum, c) => sum + c.durationMs, 0) / callLog.length
      : 0;

    return {
      startedAt,
      totalCalls: callLog.length,
      successfulCalls: successful,
      failedCalls: failed,
      uniqueTools: [...toolsObserved],
      avgDurationMs: Math.round(avgDuration),
      isRunning: true,
    };
  };

  const getCallLog = (): readonly McpCallLog[] => callLog;

  const enrichPassportFields = () => ({
    tools_observed: [...toolsObserved],
    total_calls: callLog.length,
  });

  return Object.freeze({
    interceptRequest,
    recordCall,
    getStats,
    getCallLog,
    enrichPassportFields,
  });
};
