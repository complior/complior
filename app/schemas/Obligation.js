({
  Entity: {},

  // Business identifier from ~/complior (distinct from auto-PK)
  obligationIdUnique: { type: 'string', length: { max: 50 }, unique: true, required: false },

  // Legacy fields (keep for compatibility)
  code: { type: 'string', unique: true, required: false },
  regulation: { type: 'string', length: { max: 100 }, required: false },

  // Core fields
  articleReference: { type: 'string', length: { max: 100 } },
  title: { type: 'string', length: { max: 255 } },
  description: { type: 'text' },

  // Applicability
  appliesToRole: { enum: ['provider', 'deployer', 'both'], required: false },
  appliesToRiskLevel: { type: 'json', required: false }, // array: ['unacceptable', 'high', ...]

  // Classification
  obligationType: { type: 'string', length: { max: 100 }, required: false },
  severity: { enum: ['critical', 'high', 'medium', 'low'], required: false },
  category: {
    enum: ['ai_literacy', 'deployer_obligations', 'fria', 'transparency',
      'human_oversight', 'monitoring', 'risk_management', 'data_governance',
      'record_keeping', 'registration', 'post_market_monitoring'],
    required: false,
  },

  // Action guidance
  whatToDo: { type: 'json', required: false }, // array of strings
  whatNotToDo: { type: 'json', required: false }, // array of strings
  evidenceRequired: { type: 'text', required: false },

  // Timeline
  deadline: { type: 'string', length: { max: 100 }, required: false },
  frequency: { type: 'string', length: { max: 100 }, required: false },
  penaltyForNonCompliance: { type: 'text', required: false },

  // Automation
  automatable: { enum: ['yes', 'partial', 'no'], required: false },
  automationApproach: { type: 'text', required: false },
  cliCheckPossible: { type: 'boolean', default: false },
  cliCheckDescription: { type: 'text', required: false },

  // Templates & Features
  documentTemplateNeeded: { type: 'boolean', default: false },
  documentTemplateType: { type: 'string', length: { max: 100 }, required: false },
  sdkFeatureNeeded: { type: 'boolean', default: false },

  // Hierarchy
  parentObligation: { type: 'string', length: { max: 50 }, required: false },

  // Legacy
  checkCriteria: { type: 'json', required: false },
  sortOrder: { type: 'number', default: 0 },
  riskLevel: {
    enum: ['prohibited', 'high', 'gpai', 'limited', 'minimal'],
    required: false,
  },
});
