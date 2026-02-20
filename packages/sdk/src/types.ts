export type Jurisdiction = 'EU' | 'US' | 'UK' | 'CA' | 'AU' | 'GLOBAL';
export type Role = 'provider' | 'deployer' | 'both';
export type Domain = 'hr' | 'finance' | 'healthcare' | 'education' | 'legal' | 'content';

export interface MiddlewareConfig {
  readonly jurisdictions?: readonly Jurisdiction[];
  readonly role?: Role;
  readonly domain?: Domain | readonly Domain[];
  readonly logging?: boolean;
  readonly strict?: boolean;
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

export type PreHook = (ctx: MiddlewareContext) => MiddlewareContext;
export type PostHook = (ctx: MiddlewareContext, response: unknown) => MiddlewareResult;

export interface ProviderAdapter {
  readonly name: string;
  readonly getMethodProxy: (target: unknown, method: string) => ((...args: unknown[]) => unknown) | null;
}

export interface DomainHooks {
  readonly pre: readonly PreHook[];
  readonly post: readonly PostHook[];
}
