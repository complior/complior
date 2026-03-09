import { readFile } from 'node:fs/promises';
import { parseTOML } from './toml-parser.js';
import type { MiddlewareConfig, RetryConfig } from '../types.js';

export const DEFAULT_CONFIG_PATH = '.complior/proxy.toml';

export interface ProxyConfig {
  readonly hooks?: {
    readonly logging?: boolean;
    readonly safety_filter?: boolean;
    readonly hitl_gate?: boolean;
    readonly interaction_logger?: boolean;
    readonly disclosure_injection?: boolean;
  };
  readonly thresholds?: {
    readonly bias_threshold?: number;
    readonly bias_action?: string;
    readonly safety_threshold?: number;
    readonly safety_mode?: string;
  };
  readonly sanitize?: {
    readonly mode?: string;
  };
  readonly disclosure?: {
    readonly mode?: string;
    readonly languages?: string[];
    readonly text?: string;
    readonly position?: string;
    readonly frequency?: string;
  };
  readonly hitl?: {
    readonly timeout_ms?: number;
  };
  readonly logging?: {
    readonly level?: string;
    readonly interaction_log_path?: string;
  };
  readonly retry?: {
    readonly enabled?: boolean;
    readonly max_retries?: number;
    readonly base_delay_ms?: number;
    readonly max_delay_ms?: number;
  };
}

export const loadProxyConfig = async (path?: string): Promise<ProxyConfig> => {
  const configPath = path ?? DEFAULT_CONFIG_PATH;
  try {
    const content = await readFile(configPath, 'utf-8');
    return parseTOML(content) as unknown as ProxyConfig;
  } catch {
    return {};
  }
};

export const toMiddlewareConfig = (proxy: ProxyConfig): Partial<MiddlewareConfig> => {
  const result: Record<string, unknown> = {};

  if (proxy.hooks) {
    if (proxy.hooks.logging !== undefined) result.logging = proxy.hooks.logging;
    if (proxy.hooks.safety_filter !== undefined) result.safetyFilter = proxy.hooks.safety_filter;
    if (proxy.hooks.hitl_gate !== undefined) result.hitlGate = proxy.hooks.hitl_gate;
    if (proxy.hooks.interaction_logger !== undefined) result.interactionLogger = proxy.hooks.interaction_logger;
    if (proxy.hooks.disclosure_injection !== undefined) result.disclosureInjection = proxy.hooks.disclosure_injection;
  }

  if (proxy.thresholds) {
    if (proxy.thresholds.bias_threshold !== undefined) result.biasThreshold = proxy.thresholds.bias_threshold;
    if (proxy.thresholds.bias_action !== undefined) result.biasAction = proxy.thresholds.bias_action;
    if (proxy.thresholds.safety_threshold !== undefined) result.safetyThreshold = proxy.thresholds.safety_threshold;
    if (proxy.thresholds.safety_mode !== undefined) result.safetyMode = proxy.thresholds.safety_mode;
  }

  if (proxy.sanitize?.mode !== undefined) {
    result.sanitizeMode = proxy.sanitize.mode;
  }

  if (proxy.disclosure) {
    if (proxy.disclosure.mode !== undefined) result.disclosureMode = proxy.disclosure.mode;
    if (proxy.disclosure.languages !== undefined) result.disclosureLanguages = proxy.disclosure.languages;
    if (proxy.disclosure.text !== undefined) result.disclosureText = proxy.disclosure.text;
    if (proxy.disclosure.position !== undefined) result.disclosurePosition = proxy.disclosure.position;
    if (proxy.disclosure.frequency !== undefined) result.disclosureFrequency = proxy.disclosure.frequency;
  }

  if (proxy.hitl?.timeout_ms !== undefined) {
    result.hitlGateTimeoutMs = proxy.hitl.timeout_ms;
  }

  if (proxy.logging?.interaction_log_path !== undefined) {
    result.interactionLogPath = proxy.logging.interaction_log_path;
  }

  if (proxy.retry) {
    result.retry = {
      ...(proxy.retry.enabled !== undefined && { enabled: proxy.retry.enabled }),
      ...(proxy.retry.max_retries !== undefined && { maxRetries: proxy.retry.max_retries }),
      ...(proxy.retry.base_delay_ms !== undefined && { baseDelayMs: proxy.retry.base_delay_ms }),
      ...(proxy.retry.max_delay_ms !== undefined && { maxDelayMs: proxy.retry.max_delay_ms }),
    };
  }

  return result as Partial<MiddlewareConfig>;
};

export const mergeConfigs = (
  programmatic: MiddlewareConfig,
  fileBased: Partial<MiddlewareConfig>,
): MiddlewareConfig => {
  const result: Record<string, unknown> = { ...fileBased };

  // Programmatic config wins on conflict
  for (const [key, value] of Object.entries(programmatic)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as MiddlewareConfig;
};
