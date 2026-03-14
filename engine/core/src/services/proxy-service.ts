import type { ProxyConfig, ProxyStats, McpCallLog } from '../domain/proxy/proxy-types.js';
import { ProxyConfigSchema } from '../domain/proxy/proxy-types.js';
import { createInterceptor, type ProxyInterceptor, type InterceptorDeps } from '../domain/proxy/proxy-interceptor.js';
import { createProxyBridge, type ProxyBridge } from '../domain/proxy/proxy-bridge.js';
import { createPolicyEngine, type ProxyPolicy } from '../domain/proxy/policy-engine.js';

export interface ProxyServiceDeps {
  readonly logCall?: InterceptorDeps['logCall'];
  readonly recordEvidence?: InterceptorDeps['recordEvidence'];
  readonly loadPolicy?: (projectPath: string) => Promise<ProxyPolicy | null>;
}

export interface ProxyService {
  readonly start: (config: ProxyConfig, projectPath?: string) => Promise<{ success: boolean; error?: string }>;
  readonly stop: () => { success: boolean };
  readonly health: () => ProxyStats | { isRunning: false };
  readonly getCallLog: () => readonly McpCallLog[];
}

export const createProxyService = (deps: ProxyServiceDeps): ProxyService => {
  let bridge: ProxyBridge | null = null;
  let interceptor: ProxyInterceptor | null = null;

  const start = async (rawConfig: ProxyConfig, projectPath?: string): Promise<{ success: boolean; error?: string }> => {
    if (bridge?.isRunning()) {
      return { success: false, error: 'Proxy is already running' };
    }

    const parsed = ProxyConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      return { success: false, error: `Invalid config: ${parsed.error.message}` };
    }
    const config = parsed.data;

    // Load policy from project path if available
    let policyEngine: ReturnType<typeof createPolicyEngine> | undefined;
    if (deps.loadPolicy && projectPath) {
      try {
        const policy = await deps.loadPolicy(projectPath);
        if (policy) {
          policyEngine = createPolicyEngine(policy);
        }
      } catch {
        // Policy loading failed — continue without policy (allow-all)
      }
    }

    const startedAt = new Date().toISOString();
    interceptor = createInterceptor(
      { logCall: deps.logCall, recordEvidence: deps.recordEvidence, policyEngine },
      startedAt,
    );
    bridge = createProxyBridge(config, interceptor);

    try {
      await bridge.start();
      return { success: true };
    } catch (err) {
      return { success: false, error: `Failed to start proxy: ${err instanceof Error ? err.message : String(err)}` };
    }
  };

  const stop = (): { success: boolean } => {
    if (!bridge?.isRunning()) {
      return { success: false };
    }
    bridge.stop();
    return { success: true };
  };

  const health = (): ProxyStats | { isRunning: false } => {
    if (!interceptor || !bridge?.isRunning()) {
      return { isRunning: false };
    }
    return interceptor.getStats();
  };

  const getCallLog = () => interceptor?.getCallLog() ?? [];

  return Object.freeze({ start, stop, health, getCallLog });
};
