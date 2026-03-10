/** Расширение EU AI Act assessment для LLM-моделей (pending SaaS adoption) */
export interface EuAiActModelAssessment {
  readonly risk_level?: string;
  readonly risk_reasoning?: string;
  readonly applicable_obligation_ids?: readonly string[];
  readonly confidence?: string;
  // Расширения для LLM-моделей (нет в SaaS пока):
  readonly training_cutoff?: string;
  readonly license?: string;
  readonly gpai_compliant?: boolean | null;
  readonly eu_representative?: string | null;
  readonly limitations?: readonly string[];
  readonly known_risks?: readonly string[];
}

/**
 * CLI-представление карточки AI-системы из реестра.
 * Структурно совместим с SaaS RegistryTool (PROJECT/frontend/lib/registry.ts).
 * Опущены DB-поля: registryToolId, seo, active, createdAt, updatedAt.
 */
export interface RegistryToolCard {
  readonly slug: string;
  readonly name: string;
  readonly provider: { readonly name: string; readonly website?: string };
  readonly description: string | null;
  readonly category: string | null;
  readonly riskLevel: string | null;
  readonly aiActRole: string | null;
  readonly level: 'classified' | 'scanned' | 'verified';
  readonly assessments: {
    readonly 'eu-ai-act'?: EuAiActModelAssessment;
  } | null;
  readonly detectionPatterns: {
    readonly code?: Readonly<Record<string, string | readonly string[]>>;
  } | null;
  readonly evidence: readonly {
    readonly date: string;
    readonly title: string;
    readonly type?: string;
  }[] | null;
  readonly capabilities: readonly string[] | null;
  readonly jurisdictions: readonly string[] | null;
  readonly vendorCountry: string | null;
  readonly dataResidency: string | null;
}

export const REGISTRY_CARDS: readonly RegistryToolCard[] = Object.freeze([
  {
    slug: 'gpt-4o',
    name: 'GPT-4o',
    provider: { name: 'OpenAI', website: 'https://openai.com/policies' },
    description: 'Multimodal GPT model with vision, text, and code capabilities',
    category: 'api_platform',
    riskLevel: 'gpai_systemic',
    aiActRole: 'provider',
    level: 'classified',
    assessments: {
      'eu-ai-act': {
        risk_level: 'gpai_systemic',
        risk_reasoning: 'GPAI model per Art.51. Systemic risk classification likely. No EU representative disclosed',
        applicable_obligation_ids: ['OBL-026'],
        confidence: 'medium',
        training_cutoff: '2024-10',
        license: 'proprietary',
        gpai_compliant: null,
        eu_representative: null,
        limitations: ['hallucination risk', 'no real-time data', 'context window limit'],
        known_risks: ['bias in training data', 'prompt injection susceptibility', 'overconfident outputs'],
      },
    },
    detectionPatterns: { code: { npm: ['openai'], pip: ['openai'] } },
    evidence: null,
    capabilities: ['text generation', 'code generation', 'multimodal (vision)', 'function calling', 'reasoning'],
    jurisdictions: ['US'],
    vendorCountry: 'US',
    dataResidency: 'US',
  },
  {
    slug: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: { name: 'OpenAI', website: 'https://openai.com/policies' },
    description: 'Lightweight GPT model for cost-efficient text and code tasks',
    category: 'api_platform',
    riskLevel: 'gpai',
    aiActRole: 'provider',
    level: 'classified',
    assessments: {
      'eu-ai-act': {
        risk_level: 'gpai',
        risk_reasoning: 'GPAI model per Art.51. Below systemic risk threshold',
        applicable_obligation_ids: ['OBL-026'],
        confidence: 'medium',
        training_cutoff: '2024-10',
        license: 'proprietary',
        gpai_compliant: null,
        eu_representative: null,
        limitations: ['reduced reasoning vs GPT-4o', 'hallucination risk'],
        known_risks: ['bias in training data', 'prompt injection susceptibility'],
      },
    },
    detectionPatterns: { code: { npm: ['openai'], pip: ['openai'] } },
    evidence: null,
    capabilities: ['text generation', 'code generation', 'function calling'],
    jurisdictions: ['US'],
    vendorCountry: 'US',
    dataResidency: 'US',
  },
  {
    slug: 'o1',
    name: 'OpenAI o1',
    provider: { name: 'OpenAI', website: 'https://openai.com/policies' },
    description: 'Advanced reasoning model with multi-step problem solving',
    category: 'api_platform',
    riskLevel: 'gpai_systemic',
    aiActRole: 'provider',
    level: 'classified',
    assessments: {
      'eu-ai-act': {
        risk_level: 'gpai_systemic',
        risk_reasoning: 'GPAI model per Art.51. Systemic risk due to advanced reasoning capabilities',
        applicable_obligation_ids: ['OBL-026'],
        confidence: 'medium',
        training_cutoff: '2024-10',
        license: 'proprietary',
        gpai_compliant: null,
        eu_representative: null,
        limitations: ['high latency', 'higher cost', 'no streaming in reasoning phase'],
        known_risks: ['chain-of-thought manipulation', 'overconfident reasoning', 'training data bias'],
      },
    },
    detectionPatterns: { code: { npm: ['openai'], pip: ['openai'] } },
    evidence: null,
    capabilities: ['advanced reasoning', 'multi-step problem solving', 'code generation', 'math'],
    jurisdictions: ['US'],
    vendorCountry: 'US',
    dataResidency: 'US',
  },
  {
    slug: 'claude-opus-4',
    name: 'Claude Opus 4',
    provider: { name: 'Anthropic', website: 'https://www.anthropic.com/policies' },
    description: 'Frontier model with extended thinking and Constitutional AI alignment',
    category: 'api_platform',
    riskLevel: 'gpai_systemic',
    aiActRole: 'provider',
    level: 'classified',
    assessments: {
      'eu-ai-act': {
        risk_level: 'gpai_systemic',
        risk_reasoning: 'GPAI model per Art.51. Constitutional AI alignment approach. Systemic risk classification likely',
        applicable_obligation_ids: ['OBL-026'],
        confidence: 'medium',
        training_cutoff: '2025-03',
        license: 'proprietary',
        gpai_compliant: null,
        eu_representative: null,
        limitations: ['no real-time data', 'context window limit', 'no internet access'],
        known_risks: ['hallucination risk', 'training data bias', 'sycophancy tendency'],
      },
    },
    detectionPatterns: { code: { npm: ['@anthropic-ai/sdk'], pip: ['anthropic'] } },
    evidence: null,
    capabilities: ['text generation', 'code generation', 'analysis', 'multimodal (vision)', 'extended thinking'],
    jurisdictions: ['US'],
    vendorCountry: 'US',
    dataResidency: 'US',
  },
  {
    slug: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: { name: 'Anthropic', website: 'https://www.anthropic.com/policies' },
    description: 'Balanced model for text, code, and multimodal analysis',
    category: 'api_platform',
    riskLevel: 'gpai',
    aiActRole: 'provider',
    level: 'classified',
    assessments: {
      'eu-ai-act': {
        risk_level: 'gpai',
        risk_reasoning: 'GPAI model per Art.51. Below systemic risk threshold',
        applicable_obligation_ids: ['OBL-026'],
        confidence: 'medium',
        training_cutoff: '2025-03',
        license: 'proprietary',
        gpai_compliant: null,
        eu_representative: null,
        limitations: ['reduced capability vs Opus', 'no real-time data'],
        known_risks: ['hallucination risk', 'training data bias'],
      },
    },
    detectionPatterns: { code: { npm: ['@anthropic-ai/sdk'], pip: ['anthropic'] } },
    evidence: null,
    capabilities: ['text generation', 'code generation', 'analysis', 'multimodal (vision)'],
    jurisdictions: ['US'],
    vendorCountry: 'US',
    dataResidency: 'US',
  },
  {
    slug: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: { name: 'Google', website: 'https://ai.google/responsibility/principles/' },
    description: 'Fast multimodal model optimized for low-latency tasks',
    category: 'api_platform',
    riskLevel: 'gpai',
    aiActRole: 'provider',
    level: 'classified',
    assessments: {
      'eu-ai-act': {
        risk_level: 'gpai',
        risk_reasoning: 'GPAI model per Art.51. EU data residency option available',
        applicable_obligation_ids: ['OBL-026'],
        confidence: 'medium',
        training_cutoff: '2024-08',
        license: 'proprietary',
        gpai_compliant: null,
        eu_representative: 'Google Ireland Limited',
        limitations: ['lower accuracy on complex tasks', 'hallucination risk'],
        known_risks: ['training data bias', 'geographic bias in knowledge'],
      },
    },
    detectionPatterns: { code: { npm: ['@google/generative-ai'], pip: ['google-generativeai'] } },
    evidence: null,
    capabilities: ['text generation', 'multimodal', 'code generation', 'function calling'],
    jurisdictions: ['US', 'EU'],
    vendorCountry: 'US',
    dataResidency: 'US',
  },
  {
    slug: 'gemini-2.0-pro',
    name: 'Gemini 2.0 Pro',
    provider: { name: 'Google', website: 'https://ai.google/responsibility/principles/' },
    description: 'High-capability multimodal model with reasoning and code generation',
    category: 'api_platform',
    riskLevel: 'gpai_systemic',
    aiActRole: 'provider',
    level: 'classified',
    assessments: {
      'eu-ai-act': {
        risk_level: 'gpai_systemic',
        risk_reasoning: 'GPAI model per Art.51. Systemic risk classification likely. EU data residency option available',
        applicable_obligation_ids: ['OBL-026'],
        confidence: 'medium',
        training_cutoff: '2024-08',
        license: 'proprietary',
        gpai_compliant: null,
        eu_representative: 'Google Ireland Limited',
        limitations: ['hallucination risk', 'high cost'],
        known_risks: ['training data bias', 'geographic bias', 'overconfident outputs'],
      },
    },
    detectionPatterns: { code: { npm: ['@google/generative-ai'], pip: ['google-generativeai'] } },
    evidence: null,
    capabilities: ['text generation', 'multimodal', 'code generation', 'reasoning', 'function calling'],
    jurisdictions: ['US', 'EU'],
    vendorCountry: 'US',
    dataResidency: 'US',
  },
  {
    slug: 'mistral-large',
    name: 'Mistral Large',
    provider: { name: 'Mistral AI', website: 'https://mistral.ai/terms/' },
    description: 'Large multilingual model from EU-headquartered provider',
    category: 'api_platform',
    riskLevel: 'gpai',
    aiActRole: 'provider',
    level: 'classified',
    assessments: {
      'eu-ai-act': {
        risk_level: 'gpai',
        risk_reasoning: 'EU-headquartered provider. GPAI model per Art.51. EU data residency by default',
        applicable_obligation_ids: ['OBL-026'],
        confidence: 'medium',
        training_cutoff: '2024-11',
        license: 'proprietary',
        gpai_compliant: null,
        eu_representative: 'Mistral AI (Paris, France)',
        limitations: ['smaller knowledge base', 'less tested than GPT-4/Claude'],
        known_risks: ['training data bias', 'limited safety testing disclosure'],
      },
    },
    detectionPatterns: { code: { npm: ['@mistralai/mistralai'], pip: ['mistralai'] } },
    evidence: null,
    capabilities: ['text generation', 'code generation', 'multilingual', 'function calling'],
    jurisdictions: ['EU', 'US'],
    vendorCountry: 'FR',
    dataResidency: 'EU',
  },
  {
    slug: 'mistral-small',
    name: 'Mistral Small',
    provider: { name: 'Mistral AI', website: 'https://mistral.ai/terms/' },
    description: 'Compact multilingual model for efficient text and code tasks',
    category: 'api_platform',
    riskLevel: 'gpai',
    aiActRole: 'provider',
    level: 'classified',
    assessments: {
      'eu-ai-act': {
        risk_level: 'gpai',
        risk_reasoning: 'EU-headquartered provider. Below systemic risk threshold',
        applicable_obligation_ids: ['OBL-026'],
        confidence: 'medium',
        training_cutoff: '2024-11',
        license: 'proprietary',
        gpai_compliant: null,
        eu_representative: 'Mistral AI (Paris, France)',
        limitations: ['reduced capability vs Large', 'limited reasoning'],
        known_risks: ['training data bias'],
      },
    },
    detectionPatterns: { code: { npm: ['@mistralai/mistralai'], pip: ['mistralai'] } },
    evidence: null,
    capabilities: ['text generation', 'code generation', 'multilingual'],
    jurisdictions: ['EU', 'US'],
    vendorCountry: 'FR',
    dataResidency: 'EU',
  },
  {
    slug: 'llama-3',
    name: 'Llama 3',
    provider: { name: 'Meta', website: 'https://llama.meta.com/' },
    description: 'Open-weight model for self-hosted text and code generation',
    category: 'api_platform',
    riskLevel: 'gpai',
    aiActRole: 'provider',
    level: 'classified',
    assessments: {
      'eu-ai-act': {
        risk_level: 'gpai',
        risk_reasoning: 'Open-weight model. Deployer assumes GPAI obligations if modified. Art.53(2) open-source exemption may apply',
        applicable_obligation_ids: ['OBL-026'],
        confidence: 'low',
        training_cutoff: '2024-03',
        license: 'llama-community',
        gpai_compliant: null,
        eu_representative: null,
        limitations: ['no multimodal', 'requires self-hosting or third-party provider', 'limited function calling'],
        known_risks: ['training data bias', 'deployer responsible for safety guardrails', 'no built-in content filtering'],
      },
    },
    detectionPatterns: { code: { pip: ['llama-cpp-python', 'transformers'] } },
    evidence: null,
    capabilities: ['text generation', 'code generation', 'multilingual', 'on-premise deployment'],
    jurisdictions: ['self-hosted'],
    vendorCountry: 'US',
    dataResidency: null,
  },
] as const);

export const findRegistryCard = (slug: string): RegistryToolCard | undefined =>
  REGISTRY_CARDS.find((c) => c.slug === slug);

export const findRegistryCardsByProvider = (providerName: string): readonly RegistryToolCard[] =>
  REGISTRY_CARDS.filter((c) => c.provider.name.toLowerCase() === providerName.toLowerCase());

/** Regex matching all known model slugs. Longest-first to avoid partial matches (e.g. gpt-4o vs gpt-4o-mini). */
export const REGISTRY_SLUG_PATTERN = new RegExp(
  `\\b(?:${[...REGISTRY_CARDS].sort((a, b) => b.slug.length - a.slug.length || a.slug.localeCompare(b.slug)).map((c) => c.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'g',
);

/** Check if a card is classified as GPAI with systemic risk. */
export const isGpaiSystemic = (card: RegistryToolCard): boolean =>
  card.riskLevel === 'gpai_systemic';

/** Get the provider name from a card. */
export const getProviderName = (card: RegistryToolCard): string =>
  card.provider.name;
