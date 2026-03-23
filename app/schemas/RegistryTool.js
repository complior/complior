({
  Entity: {},

  // Primary key from ~/complior
  slug: { type: 'string', length: { max: 100 }, unique: true },

  // Core fields
  name: { type: 'string', length: { max: 255 } },
  provider: { type: 'json' }, // { name: string, website: string }
  website: { type: 'string', length: { max: 500 }, required: false },
  categories: { type: 'json' }, // array: ['chatbot', 'foundation-model', ...]
  description: { type: 'text', required: false },

  // Source tracking
  source: { type: 'string', length: { max: 100 }, required: false },
  rankOnSource: { type: 'number', required: false },

  // Quality level
  level: { enum: ['classified', 'scanned', 'verified'], default: 'classified' },
  priorityScore: { type: 'number', default: 0 },

  // Evidence & Assessments
  evidence: { type: 'json', required: false }, // { passive_scan, llm_tests, media_tests, human_tests }
  assessments: { type: 'json', required: false }, // { 'eu-ai-act': { risk_level, reasoning, obligations, score } }

  // SEO
  seo: { type: 'json', required: false }, // { title, description, h1 }

  // Legacy fields (keep for compatibility)
  category: {
    enum: ['chatbot', 'recruitment', 'coding', 'analytics', 'customer_service',
      'marketing', 'writing', 'image_generation', 'video', 'translation',
      'medical', 'legal', 'finance', 'education', 'api_platform', 'other'],
    required: false,
  },
  riskLevel: {
    // Values mirror assessments['eu-ai-act']['risk_level'] — populated from assessments JSON
    // 'unacceptable' = Art.5 prohibited practices; 'gpai_systemic' = Art.51 systemic risk GPAI
    enum: ['unacceptable', 'high', 'gpai_systemic', 'gpai', 'limited', 'minimal'],
    required: false,
  },
  aiActRole: {
    enum: ['provider', 'deployer_product', 'hybrid', 'infrastructure', 'ai_feature'],
    required: false,
  },
  websiteUrl: { type: 'string', required: false },
  vendorCountry: { type: 'string', length: { min: 2, max: 2 }, required: false },
  dataResidency: { type: 'string', required: false },
  capabilities: { type: 'json', required: false },
  jurisdictions: { type: 'json', required: false },
  detectionPatterns: { type: 'json', required: false },
  active: { type: 'boolean', default: true },
});
