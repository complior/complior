/**
 * Framework Service — orchestrates multi-framework scoring.
 * Selected frameworks → registry lookup → metrics collection → per-framework scoring.
 */

import type { FrameworkRegistry } from '../domain/frameworks/framework-registry.js';
import type { FoundationMetricsDeps } from '../domain/frameworks/collect-foundation-metrics.js';
import { collectFoundationMetrics } from '../domain/frameworks/collect-foundation-metrics.js';
import type {
  FrameworkScoreResult,
  MultiFrameworkScoreResult,
} from '../types/framework.types.js';

export interface FrameworkService {
  readonly getScores: () => Promise<MultiFrameworkScoreResult>;
  readonly getScore: (frameworkId: string) => Promise<FrameworkScoreResult | null>;
  readonly listAvailable: () => readonly string[];
  readonly listSelected: () => readonly string[];
}

export interface FrameworkServiceDeps {
  readonly registry: FrameworkRegistry;
  readonly getSelectedFrameworks: () => readonly string[];
  readonly foundationDeps: FoundationMetricsDeps;
}

export const createFrameworkService = (deps: FrameworkServiceDeps): FrameworkService => {
  const scoreOne = async (frameworkId: string): Promise<FrameworkScoreResult | null> => {
    const entry = deps.registry.get(frameworkId);
    if (!entry) return null;
    const metrics = await collectFoundationMetrics(deps.foundationDeps);
    return entry.score(entry.definition, metrics);
  };

  return Object.freeze({
    async getScores(): Promise<MultiFrameworkScoreResult> {
      const selectedIds = deps.getSelectedFrameworks();
      const metrics = await collectFoundationMetrics(deps.foundationDeps);

      const frameworks: FrameworkScoreResult[] = [];
      for (const id of selectedIds) {
        const entry = deps.registry.get(id);
        if (entry) {
          frameworks.push(entry.score(entry.definition, metrics));
        }
      }

      return Object.freeze({
        frameworks,
        selectedFrameworkIds: selectedIds,
        computedAt: new Date().toISOString(),
      });
    },

    async getScore(frameworkId: string): Promise<FrameworkScoreResult | null> {
      return scoreOne(frameworkId);
    },

    listAvailable(): readonly string[] {
      return deps.registry.ids();
    },

    listSelected(): readonly string[] {
      return deps.getSelectedFrameworks();
    },
  });
};
