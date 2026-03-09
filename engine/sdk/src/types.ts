export type Jurisdiction = 'EU' | 'US' | 'UK' | 'CA' | 'AU' | 'GLOBAL';
export type Role = 'provider' | 'deployer' | 'both';
export type Domain = 'hr' | 'finance' | 'healthcare' | 'education' | 'legal' | 'content';

export interface MiddlewareConfig {
  readonly jurisdictions?: readonly Jurisdiction[];
  readonly role?: Role;
  readonly domain?: Domain | readonly Domain[];
  readonly logging?: boolean;
  readonly strict?: boolean;
  readonly sanitizeMode?: 'replace' | 'block' | 'warn';
  readonly guardApi?: boolean;
  readonly disclosureLanguages?: readonly ('EN' | 'DE' | 'FR' | 'ES')[];
  readonly disclosureMode?: 'warn-only' | 'block';
  readonly customDisclosurePhrases?: readonly RegExp[];
  readonly biasThreshold?: number;
  readonly biasAction?: 'warn' | 'block';
  readonly safetyFilter?: boolean;
  readonly safetyMode?: 'block' | 'warn' | 'log';
  readonly safetyThreshold?: number;
  readonly hitlGate?: boolean;
  readonly hitlGateTimeoutMs?: number;
  readonly hitlGateRules?: readonly GateRule[];
  readonly onGateTriggered?: (request: GateRequest) => Promise<GateDecision>;
  readonly disclosureInjection?: boolean;
  readonly disclosureText?: string;
  readonly disclosurePosition?: 'prepend' | 'append' | 'header';
  readonly disclosureFrequency?: 'every' | 'session-start';
  readonly interactionLogger?: boolean;
  readonly interactionLogPath?: string;
}

export interface MiddlewareContext {
  readonly provider: string;
  readonly method: string;
  readonly config: MiddlewareConfig;
  params: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface MiddlewareResult {
  readonly response: unknown;
  readonly metadata: Record<string, unknown>;
  readonly headers: Record<string, string>;
}

export interface GateRule {
  readonly id: string;
  readonly description: string;
  readonly pattern: RegExp;
  readonly category: string;
}

export interface GateRequest {
  readonly rule: GateRule;
  readonly matchedText: string;
  readonly provider: string;
  readonly method: string;
  readonly timestamp: number;
}

export type GateDecision = { approved: true } | { approved: false; reason?: string };

export type PreHook = (ctx: MiddlewareContext) => MiddlewareContext;
export type PostHook = (ctx: MiddlewareContext, response: unknown) => MiddlewareResult | Promise<MiddlewareResult>;

export interface ProviderAdapter {
  readonly name: string;
  readonly getMethodProxy: (target: unknown, method: string) => ((...args: unknown[]) => unknown) | null;
}

export interface DomainHooks {
  readonly pre: readonly PreHook[];
  readonly post: readonly PostHook[];
}

/** Key used to attach compliance metadata to LLM responses */
export const COMPLIOR_METADATA_KEY = '_complior';
