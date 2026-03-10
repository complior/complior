import type { RegistryToolCard } from '../../data/registry-cards.js';

export type SupplyChainRiskType =
  | 'banned-package'
  | 'ai-sdk-no-card'
  | 'missing-bias-testing'
  | 'gpai-systemic';

export interface SupplyChainRisk {
  readonly type: SupplyChainRiskType;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly packageName: string;
  readonly packageVersion: string;
  readonly ecosystem: string;
  readonly description: string;
  readonly articleRef: string;
  readonly obligationId: string;
}

export interface SupplyChainReport {
  readonly projectPath: string;
  readonly timestamp: string;
  readonly duration: number;
  readonly totalDependencies: number;
  readonly aiSdkCount: number;
  readonly bannedCount: number;
  readonly risks: readonly SupplyChainRisk[];
  readonly riskScore: number;
  readonly detectedModels: readonly string[];
  readonly registryCards: readonly RegistryToolCard[];
  readonly obligationRefs: readonly string[];
}
