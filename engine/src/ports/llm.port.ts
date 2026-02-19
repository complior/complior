export type ProviderName = 'openai' | 'anthropic' | 'openrouter';

export interface ProviderInfo {
  readonly name: ProviderName;
  readonly available: boolean;
  readonly envVar: string;
}

export interface ModelSelection {
  readonly provider: ProviderName;
  readonly modelId: string;
  readonly reason: string;
}

export interface LlmPort {
  readonly getModel: (provider: ProviderName, modelId: string, apiKey?: string) => Promise<unknown>;
  readonly detectProviders: () => readonly ProviderInfo[];
  readonly getAvailableProviders: () => readonly ProviderInfo[];
  readonly getDefaultProvider: () => ProviderName;
  readonly routeModel: (taskType: string, preferredProvider?: ProviderName) => ModelSelection;
}
