import type { ComplianceFramework, FoundationMetrics, FrameworkScoreResult } from '../../types/framework.types.js';

export type FrameworkScorer = (fw: ComplianceFramework, metrics: FoundationMetrics) => FrameworkScoreResult;

export interface RegisteredFramework {
  readonly definition: ComplianceFramework;
  readonly score: FrameworkScorer;
}

export interface FrameworkRegistry {
  readonly register: (fw: ComplianceFramework, scorer: FrameworkScorer) => void;
  readonly get: (id: string) => RegisteredFramework | undefined;
  readonly getAll: () => readonly RegisteredFramework[];
  readonly has: (id: string) => boolean;
  readonly ids: () => readonly string[];
}

export const createFrameworkRegistry = (): FrameworkRegistry => {
  const map = new Map<string, RegisteredFramework>();

  return Object.freeze({
    register(fw: ComplianceFramework, scorer: FrameworkScorer): void {
      map.set(fw.id, { definition: fw, score: scorer });
    },
    get(id: string): RegisteredFramework | undefined {
      return map.get(id);
    },
    getAll(): readonly RegisteredFramework[] {
      return [...map.values()];
    },
    has(id: string): boolean {
      return map.has(id);
    },
    ids(): readonly string[] {
      return [...map.keys()];
    },
  });
};
