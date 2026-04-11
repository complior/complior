/**
 * MITRE ATLAS Framework Adapter.
 * Follows the same create*Framework() + score*() pattern as eu-ai-act-framework.ts.
 */

import type { ComplianceFramework, FrameworkCategory, FrameworkCheck, FrameworkScoreResult, FoundationMetrics } from '../../types/framework.types.js';
import { MITRE_ATLAS_TACTICS } from '../../data/security/mitre-atlas.js';
import { LETTER_GRADE_THRESHOLDS } from '../shared/compliance-constants.js';
import { scorePluginFramework } from './score-plugin-framework.js';

export const createMitreAtlasFramework = (): ComplianceFramework => {
  const categories: FrameworkCategory[] = MITRE_ATLAS_TACTICS.map((tactic) => ({
    id: tactic.id,
    name: tactic.name,
    weight: 1,
  }));

  const checks: FrameworkCheck[] = MITRE_ATLAS_TACTICS.flatMap((tactic) =>
    tactic.plugins.map((plugin, idx) => ({
      id: `${tactic.id}-${idx}`,
      name: `${tactic.name}: ${plugin}`,
      source: 'scan_check' as const,
      target: plugin,
      categoryId: tactic.id,
      weight: 1,
      description: `MITRE ATLAS ${tactic.id} — test plugin: ${plugin}`,
    })),
  );

  return Object.freeze({
    id: 'mitre-atlas',
    name: 'MITRE ATLAS',
    version: '4.0',
    checks,
    categories,
    gradeMapping: Object.freeze({
      type: 'letter' as const,
      thresholds: [...LETTER_GRADE_THRESHOLDS],
    }),
  });
};

/**
 * Score the MITRE ATLAS framework (no critical cap).
 */
export const scoreMitreAtlas = (
  fw: ComplianceFramework,
  metrics: FoundationMetrics,
): FrameworkScoreResult =>
  scorePluginFramework(fw, metrics, MITRE_ATLAS_TACTICS, {
    matchPrefix: (cat) => (cat as typeof MITRE_ATLAS_TACTICS[number]).tactic,
    applyCriticalCap: false,
  });
