/**
 * TargetAdapter port — interface for sending probes to external AI endpoints.
 *
 * Adapters translate generic probes into vendor-specific HTTP requests.
 * The eval system never imports concrete adapters directly; everything
 * goes through this contract.
 */

export interface TargetResponse {
  readonly text: string;
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly latencyMs: number;
  readonly raw?: unknown;
}

export interface ProbeOptions {
  readonly systemPrompt?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly timeout?: number;
}

export interface TargetAdapter {
  /** Send a single-turn probe. */
  readonly send: (probe: string, options?: ProbeOptions) => Promise<TargetResponse>;
  /** Send a multi-turn probe (main + follow-up). */
  readonly sendMultiTurn: (probes: readonly string[], options?: ProbeOptions) => Promise<readonly TargetResponse[]>;
  /** Check if the target is reachable. */
  readonly checkHealth: () => Promise<boolean>;
  /** Human-readable adapter name (e.g. "openai", "ollama"). */
  readonly name: string;
}
