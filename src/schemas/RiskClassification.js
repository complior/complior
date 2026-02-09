({
  Entity: {},

  aiTool: { type: 'AITool', delete: 'cascade' },
  riskLevel: {
    enum: ['prohibited', 'high', 'gpai', 'limited', 'minimal'],
  },
  annexCategory: { type: 'string', required: false },
  confidence: { type: 'number', note: '0-100 percentage' },
  reasoning: { type: 'string', length: { max: 10000 } },

  // Hybrid engine results
  ruleResult: { type: 'json', note: '{ riskLevel, confidence, matchedRules[] }' },
  llmResult: { type: 'json', required: false },
  crossValidation: { type: 'json', required: false },
  method: {
    enum: ['rule_only', 'rule_plus_llm', 'cross_validated'],
  },

  articleReferences: { type: 'json', note: 'Array of { article, text, relevance }' },

  version: { type: 'number', default: 1 },
  isCurrent: { type: 'boolean', default: true, index: true },
  classifiedBy: { type: 'User', delete: 'restrict' },
});
