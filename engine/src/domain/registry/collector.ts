/**
 * Registry Collector — processes raw tool data into classified RegistryTool entries.
 * Wave 1: Mass collect + classify (no web fetching needed).
 */

import type { Obligation } from '../../data/schemas-core.js';
import type { RegistryTool, ToolEvidence, JurisdictionAssessment } from './types.js';
import {
  classifyRiskLevel,
  getApplicableObligationIds,
  buildObligationAssessments,
  generateRiskReasoning,
  generateSeoFields,
  computePriorityScore,
} from './classify.js';

export interface RawTool {
  readonly name: string;
  readonly provider: string;
  readonly website: string;
  readonly categories: readonly string[];
  readonly description: string;
  readonly source: string;
  readonly rank: number | null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const EMPTY_EVIDENCE: ToolEvidence = {
  passive_scan: null,
  llm_tests: null,
  media_tests: null,
  human_tests: null,
};

export function deduplicateTools(tools: readonly RawTool[]): RawTool[] {
  const seen = new Map<string, RawTool>();

  for (const tool of tools) {
    const key = `${tool.name.toLowerCase()}::${tool.provider.toLowerCase()}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, tool);
    } else {
      // Merge: prefer entry with more categories or higher rank
      const merged: RawTool = {
        name: existing.name,
        provider: existing.provider,
        website: existing.website || tool.website,
        categories: Array.from(new Set([...existing.categories, ...tool.categories])),
        description: existing.description.length >= tool.description.length
          ? existing.description
          : tool.description,
        source: existing.source,
        rank: existing.rank ?? tool.rank,
      };
      seen.set(key, merged);
    }
  }

  return Array.from(seen.values());
}

export function classifyTool(
  raw: RawTool,
  obligations: readonly Obligation[],
  categoryCountMap: Map<string, number>,
): RegistryTool {
  const slug = slugify(raw.name);
  const riskLevel = classifyRiskLevel(raw.categories, raw.provider);
  const obligationIds = getApplicableObligationIds(riskLevel, raw.categories);

  const deployerObligations = buildObligationAssessments(obligationIds, obligations, 'deployer');
  const providerObligations = buildObligationAssessments(obligationIds, obligations, 'provider');

  const totalObligations = deployerObligations.length + providerObligations.length;

  const assessment: JurisdictionAssessment = {
    jurisdiction_id: 'eu-ai-act',
    risk_level: riskLevel,
    risk_reasoning: generateRiskReasoning(raw.name, raw.categories, riskLevel),
    applicable_obligation_ids: obligationIds,
    deployer_obligations: deployerObligations,
    provider_obligations: providerObligations,
    score: null,
    confidence: 'approximate',
    assessed_at: new Date().toISOString(),
  };

  const seo = generateSeoFields(raw.name, raw.provider, riskLevel, totalObligations);
  const priorityScore = computePriorityScore(raw.rank, riskLevel, raw.categories, categoryCountMap);

  const now = new Date().toISOString();

  return {
    slug,
    name: raw.name,
    provider: { name: raw.provider, website: raw.website },
    website: raw.website,
    categories: [...raw.categories],
    description: raw.description,
    source: raw.source,
    rank_on_source: raw.rank,
    level: 'classified',
    priority_score: Math.round(priorityScore * 1000) / 1000,
    evidence: EMPTY_EVIDENCE,
    assessments: { 'eu-ai-act': assessment },
    seo,
    created_at: now,
    updated_at: now,
  };
}

export function buildCategoryCountMap(tools: readonly RawTool[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const tool of tools) {
    const cat = tool.categories[0] ?? 'other';
    map.set(cat, (map.get(cat) ?? 0) + 1);
  }
  return map;
}

export function collectAndClassify(
  rawTools: readonly RawTool[],
  obligations: readonly Obligation[],
): RegistryTool[] {
  const deduped = deduplicateTools(rawTools);
  const categoryCountMap = buildCategoryCountMap(deduped);

  return deduped.map(raw => classifyTool(raw, obligations, categoryCountMap));
}

export function selectTopN(tools: readonly RegistryTool[], n: number): RegistryTool[] {
  return [...tools]
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, n);
}

export function selectTop400(tools: readonly RegistryTool[]): RegistryTool[] {
  return selectTopN(tools, 400);
}
