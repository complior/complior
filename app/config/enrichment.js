'use strict';

/**
 * Enrichment pipeline configuration
 */
module.exports = {
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: 'https://openrouter.ai/api/v1',
    rateLimitPerMin: parseInt(process.env.ENRICHMENT_LLM_RATE_LIMIT, 10) || 50,
    maxTokens: 512,
    temperature: 0.3,
    timeoutMs: 30000,
  },

  passiveScanner: {
    ratePerSec: parseFloat(process.env.ENRICHMENT_SCAN_RATE) || 2,
    timeoutMs: parseInt(process.env.ENRICHMENT_SCAN_TIMEOUT, 10) || 10000,
    maxPagesPerTool: parseInt(process.env.ENRICHMENT_MAX_PAGES, 10) || 20,
    concurrency: parseInt(process.env.ENRICHMENT_SCAN_CONCURRENCY, 10) || 3,
    enableLinkDiscovery: process.env.ENRICHMENT_LINK_DISCOVERY !== 'false',
    enableSitemapParsing: process.env.ENRICHMENT_SITEMAP !== 'false',
    userAgent: 'CompliorBot/1.0 (+https://complior.eu/bot)',
  },

  mediaTester: {
    enabled: process.env.ENRICHMENT_MEDIA_ENABLED !== 'false',
    timeoutMs: parseInt(process.env.ENRICHMENT_MEDIA_TIMEOUT, 10) || 60000,
    testPrompt: 'A simple red circle on a white background, minimal, test image',
  },

  judge: {
    model: process.env.ENRICHMENT_JUDGE_MODEL || 'mistralai/mistral-small-2503',
    maxTokens: 256,
    temperature: 0.1,
    timeoutMs: 15000,
    rateLimitPerMin: parseInt(process.env.ENRICHMENT_JUDGE_RATE_LIMIT, 10) || 30,
  },

  features: {
    passiveScan: process.env.ENRICHMENT_PASSIVE_SCAN !== 'false',
    llmTests: process.env.ENRICHMENT_LLM_TESTS !== 'false',
    mediaTests: process.env.ENRICHMENT_MEDIA_TESTS !== 'false',
    llmJudge: process.env.ENRICHMENT_LLM_JUDGE !== 'false',
    abBiasTests: process.env.ENRICHMENT_AB_BIAS !== 'false',
    securityTests: process.env.ENRICHMENT_SECURITY_TESTS !== 'false',
  },

  // v3: LLM test configuration
  llmTests: {
    testCount: 680,
    modes: {
      deterministic: { count: 168, llmCost: 0 },
      llmJudged: { count: 212, llmCost: 0.06 },
      security: { count: 300, llmCost: 0 },
    },
    categories: [
      'transparency', 'oversight', 'explanation', 'bias',
      'accuracy', 'robustness', 'prohibited', 'logging',
      'risk_awareness', 'gpai', 'industry', 'security',
    ],
  },

  // v3: Public scan funnel configuration
  publicScan: {
    enabled: process.env.PUBLIC_SCAN_ENABLED !== 'false',
    // Rate limits
    maxScansPerDayAnon: parseInt(process.env.PUBLIC_SCAN_MAX_ANON, 10) || 3,
    maxScansPerDayAuth: parseInt(process.env.PUBLIC_SCAN_MAX_AUTH, 10) || 10,
    endpointCooldownDays: parseInt(process.env.PUBLIC_SCAN_COOLDOWN, 10) || 30,
    captchaThreshold: parseInt(process.env.PUBLIC_SCAN_CAPTCHA_THRESHOLD, 10) || 5,
    // Cost budget
    evalCostBudgetPerDay: parseFloat(process.env.PUBLIC_SCAN_BUDGET) || 10.0,
    // Modes
    modes: {
      passive: { llmCost: 0, timeoutSec: 30 },
      detSecurity: { llmCost: 0, timeoutSec: 180, testCount: 468 },
      full: { llmCost: 0.08, timeoutSec: 600, testCount: 680 },
    },
  },

  // v3: Trust level evidence weights
  trustLevelWeights: {
    thirdPartyVerified: 1.0,
    vendorSelfReport: 0.85,
    communityReported: 0.7,
    autoAssessedWithCitation: 0.6,
    autoAssessedNoCitation: 0.4,
  },

  providerTiers: {
    tier1: [ // +20 bonus — Major AI/tech leaders
      'Anthropic', 'OpenAI', 'Google', 'Microsoft', 'Meta',
      'Amazon', 'NVIDIA', 'IBM', 'Apple', 'Samsung',
    ],
    tier2: [ // +10 bonus — Established AI companies
      'Stability AI', 'Mistral', 'Cohere', 'Hugging Face', 'Adobe',
      'Salesforce', 'Databricks', 'DeepSeek', 'ByteDance', 'Alibaba',
      'Baidu', 'Tencent', 'SAP', 'Oracle', 'Palantir',
    ],
  },
};
