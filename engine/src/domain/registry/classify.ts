import type { RiskLevel } from '../../types/common.types.js';
import type { Obligation } from '../../data/schemas-core.js';
import type { ObligationAssessment, SeoFields } from './types.js';

// --- Category → Risk Level (EU AI Act) ---

const CATEGORY_TO_RISK: Record<string, RiskLevel> = {
  // PROHIBITED (Art. 5)
  'social-scoring': 'unacceptable',
  'biometric-surveillance': 'unacceptable',
  'emotion-recognition-workplace': 'unacceptable',
  'emotion-recognition-education': 'unacceptable',
  'subliminal-manipulation': 'unacceptable',
  'vulnerability-exploitation': 'unacceptable',

  // HIGH RISK (Annex III)
  'biometric-identification': 'high',
  'critical-infrastructure': 'high',
  'education-admission': 'high',
  'education-assessment': 'high',
  'education-proctoring': 'high',
  'hr-recruitment': 'high',
  'hr-screening': 'high',
  'hr-evaluation': 'high',
  'credit-scoring': 'high',
  'insurance-pricing': 'high',
  'law-enforcement': 'high',
  'migration-border': 'high',
  'justice-legal-analysis': 'high',
  'medical-diagnosis': 'high',
  'benefits-allocation': 'high',

  // GPAI (Art. 51-56)
  'foundation-model': 'gpai',
  'llm': 'gpai',
  'multimodal-model': 'gpai',

  // LIMITED (Art. 50)
  'chatbot': 'limited',
  'text-generation': 'limited',
  'image-generation': 'limited',
  'video-generation': 'limited',
  'voice-tts': 'limited',
  'voice-clone': 'limited',
  'music-generation': 'limited',
  'deepfake': 'limited',

  // MINIMAL
  'productivity': 'minimal',
  'translation': 'minimal',
  'search': 'minimal',
  'analytics': 'minimal',
  'code-assistant': 'minimal',
  'design': 'minimal',
  'automation': 'minimal',
  'writing': 'minimal',
  'summarization': 'minimal',
  'data-extraction': 'minimal',
  'customer-service': 'minimal',
  'marketing': 'minimal',
  'sales': 'minimal',
  'research': 'minimal',
  'presentation': 'minimal',
  'spreadsheet': 'minimal',
  'note-taking': 'minimal',
  'scheduling': 'minimal',
  'transcription': 'minimal',
  'photo-editing': 'minimal',
  'seo': 'minimal',
  'social-media': 'minimal',
  'email': 'minimal',
  'finance': 'minimal',
  'legal': 'minimal',
  'real-estate': 'minimal',
  'gaming': 'minimal',
  'fitness': 'minimal',
  'cooking': 'minimal',
  'shopping': 'minimal',
  'travel': 'minimal',
  'dating': 'minimal',
  'developer-tools': 'minimal',
  'no-code': 'minimal',
  'api': 'minimal',
  'database': 'minimal',
  'testing': 'minimal',
  'security': 'minimal',
  'devops': 'minimal',
  'other': 'minimal',
};

// Providers whose code-assistant tools are actually GPAI
const GPAI_PROVIDERS = new Set([
  'openai', 'anthropic', 'google', 'meta', 'mistral', 'cohere',
  'deepseek', 'alibaba', 'zhipu', 'baidu', 'stability-ai',
  'microsoft', 'amazon', 'nvidia', 'inflection', 'xai',
]);

// --- Risk Level → Obligation IDs ---

const RISK_TO_OBLIGATIONS: Record<RiskLevel, readonly string[]> = {
  unacceptable: [
    'OBL-002', 'OBL-002a', 'OBL-002b', 'OBL-002c', 'OBL-002d',
    'OBL-002e', 'OBL-002f', 'OBL-002g', 'OBL-001',
  ],
  high: [
    'OBL-001', 'OBL-002', 'OBL-003', 'OBL-004', 'OBL-004a', 'OBL-004b',
    'OBL-005', 'OBL-006', 'OBL-006a', 'OBL-007', 'OBL-008', 'OBL-008a',
    'OBL-009', 'OBL-010', 'OBL-011', 'OBL-012', 'OBL-013', 'OBL-014',
    'OBL-015', 'OBL-016', 'OBL-019', 'OBL-020', 'OBL-020a', 'OBL-021',
  ],
  gpai: [
    'OBL-001', 'OBL-015', 'OBL-016', 'OBL-016a', 'OBL-018',
    'OBL-022', 'OBL-022a', 'OBL-022b', 'OBL-022c', 'OBL-025',
  ],
  gpai_systemic: [
    'OBL-001', 'OBL-015', 'OBL-016', 'OBL-016a', 'OBL-018',
    'OBL-022', 'OBL-022a', 'OBL-022b', 'OBL-022c', 'OBL-025',
    'OBL-023', 'OBL-024', 'OBL-024a',
  ],
  limited: [
    'OBL-001', 'OBL-015', 'OBL-016', 'OBL-016a', 'OBL-017', 'OBL-018',
  ],
  minimal: ['OBL-001'],
};

// Domain-specific obligation enrichment
const DOMAIN_OBLIGATIONS: Record<string, readonly string[]> = {
  'hr-': ['OBL-HR-001', 'OBL-HR-002', 'OBL-HR-003'],
  'finance': ['OBL-FIN-001', 'OBL-FIN-002'],
  'credit-scoring': ['OBL-FIN-001', 'OBL-FIN-002', 'OBL-FIN-003'],
  'insurance': ['OBL-FIN-002', 'OBL-FIN-004'],
  'healthcare': ['OBL-MED-001', 'OBL-MED-002'],
  'medical': ['OBL-MED-001', 'OBL-MED-002'],
  'education': ['OBL-EDU-001'],
  'chatbot': ['OBL-CS-001'],
  'customer-service': ['OBL-CS-001'],
  'marketing': ['OBL-MKT-001'],
};

// --- Classification functions ---

export function classifyRiskLevel(
  categories: readonly string[],
  providerName: string,
): RiskLevel {
  const normalizedProvider = providerName.toLowerCase().replace(/\s+/g, '-');

  // Find highest risk from all categories
  let highestRisk: RiskLevel = 'minimal';
  const riskOrder: Record<RiskLevel, number> = {
    unacceptable: 5,
    high: 4,
    gpai_systemic: 3,
    gpai: 2,
    limited: 1,
    minimal: 0,
  };

  for (const cat of categories) {
    const risk = CATEGORY_TO_RISK[cat];
    if (risk && riskOrder[risk] > riskOrder[highestRisk]) {
      highestRisk = risk;
    }
  }

  // Override: code-assistant from GPAI provider → gpai
  if (
    highestRisk === 'minimal' &&
    categories.includes('code-assistant') &&
    GPAI_PROVIDERS.has(normalizedProvider)
  ) {
    return 'gpai';
  }

  return highestRisk;
}

export function getApplicableObligationIds(
  riskLevel: RiskLevel,
  categories: readonly string[],
): string[] {
  const ids = new Set<string>(RISK_TO_OBLIGATIONS[riskLevel]);

  // Add domain-specific obligations
  for (const cat of categories) {
    for (const [prefix, oblIds] of Object.entries(DOMAIN_OBLIGATIONS)) {
      if (cat.startsWith(prefix) || cat === prefix) {
        for (const id of oblIds) ids.add(id);
      }
    }
  }

  return Array.from(ids).sort();
}

export function buildObligationAssessments(
  obligationIds: readonly string[],
  obligations: readonly Obligation[],
  roleFilter: 'provider' | 'deployer',
): ObligationAssessment[] {
  const oblMap = new Map(
    obligations.map(o => [o.obligation_id.replace('eu-ai-act-', ''), o]),
  );

  const result: ObligationAssessment[] = [];
  for (const id of obligationIds) {
    const obl = oblMap.get(id);
    if (!obl) continue;

    const role = obl.applies_to_role as string;
    if (role !== 'both' && role !== roleFilter) continue;

    result.push({
      obligation_id: id,
      title: obl.title,
      article: obl.article_reference,
      applies_to_role: role,
      deadline: obl.deadline ?? null,
      severity: obl.severity,
      status: 'unknown',
      evidence_summary: null,
    });
  }
  return result;
}

export function generateRiskReasoning(
  name: string,
  categories: readonly string[],
  riskLevel: RiskLevel,
): string {
  const categoryStr = categories.join(', ');
  switch (riskLevel) {
    case 'unacceptable':
      return `${name} classified as prohibited under Article 5 EU AI Act. Categories: ${categoryStr}.`;
    case 'high':
      return `${name} classified as high-risk under Annex III EU AI Act. Categories: ${categoryStr}. Full provider and deployer obligations apply.`;
    case 'gpai_systemic':
      return `${name} classified as GPAI model with systemic risk under Article 51-56 EU AI Act. Model exceeds 10M MAU threshold. Additional obligations apply including adversarial testing and incident reporting.`;
    case 'gpai':
      return `${name} classified as general-purpose AI model under Articles 51-56. Transparency, documentation, and systemic risk obligations apply.`;
    case 'limited':
      return `${name} subject to Article 50 transparency obligations. Users must be informed of AI interaction and generated content must be marked.`;
    case 'minimal':
      return `${name} classified as minimal risk. Only AI literacy (Article 4) obligations apply. Voluntary codes of conduct encouraged.`;
  }
}

export function generateSeoFields(
  name: string,
  provider: string,
  riskLevel: RiskLevel,
  obligationCount: number,
): SeoFields {
  return {
    title: `${name} — EU AI Act Compliance | Complior`,
    description: `${name} by ${provider}: ${riskLevel} risk. ${obligationCount} obligations. EU AI Act classification, checklist, and compliance guide.`,
    h1: `${name} — EU AI Act Compliance Guide`,
  };
}

export function computePriorityScore(
  rankOnSource: number | null,
  riskLevel: RiskLevel,
  categories: readonly string[],
  totalInCategory: Map<string, number>,
): number {
  // popularity: normalize rank (lower rank = more popular)
  const popularity = rankOnSource !== null
    ? Math.max(0, 1 - rankOnSource / 5000)
    : 0.1;

  // seo_value: assume 1.0 for now (no competitor data at classify stage)
  const seoValue = 1.0;

  // risk_severity
  const riskScore: Record<RiskLevel, number> = {
    unacceptable: 1.0,
    high: 0.8,
    gpai_systemic: 0.7,
    gpai: 0.6,
    limited: 0.4,
    minimal: 0.2,
  };
  const riskSeverity = riskScore[riskLevel];

  // category_gap: underrepresented categories get higher score
  const primaryCat = categories[0] ?? 'other';
  const catCount = totalInCategory.get(primaryCat) ?? 0;
  const categoryGap = catCount < 10 ? 1.0 : 0.3;

  return (
    popularity * 0.4 +
    seoValue * 0.25 +
    riskSeverity * 0.2 +
    categoryGap * 0.15
  );
}

/**
 * Upgrade a tool from 'gpai' to 'gpai_systemic' if its estimated MAU > 10M.
 * Returns the new risk level (or the same if no upgrade).
 */
export function upgradeToSystemic(
  currentRiskLevel: RiskLevel,
  estimatedMau: number | null,
): RiskLevel {
  if (currentRiskLevel === 'gpai' && estimatedMau !== null && estimatedMau > 10_000_000) {
    return 'gpai_systemic';
  }
  return currentRiskLevel;
}

export { CATEGORY_TO_RISK, RISK_TO_OBLIGATIONS, DOMAIN_OBLIGATIONS, GPAI_PROVIDERS };
