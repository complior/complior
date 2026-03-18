/**
 * Security data barrel — re-exports all security framework data.
 * Data extracted from Promptfoo (MIT License), zero runtime dependency.
 */

export { OWASP_LLM_TOP_10, getOwaspCategory, getOwaspCategoryByOwaspId, getOwaspCategoriesForPlugin } from './owasp-llm-top10.js';
export type { OwaspLlmCategory } from './owasp-llm-top10.js';

export { MITRE_ATLAS_TACTICS, getMitreAtlasTactic, getMitreAtlasByMitreId } from './mitre-atlas.js';
export type { MitreAtlasTactic } from './mitre-atlas.js';

export { NIST_AI_RMF_SUBCATEGORIES } from './nist-ai-rmf.js';
export type { NistAiRmfSubcategory } from './nist-ai-rmf.js';

export { EU_AI_ACT_SECURITY_ENTRIES } from './eu-ai-act-security.js';
export type { EuAiActSecurityEntry } from './eu-ai-act-security.js';

export { ATTACK_PROBES, getProbesByCategory, getProbesByPlugin, getProbesBySeverity, probeCountByCategory } from './attack-probes.js';
export type { AttackProbe } from './attack-probes.js';
