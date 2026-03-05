({
  Entity: {},

  organization: { type: 'Organization', delete: 'cascade' },
  createdBy: { type: 'User', delete: 'restrict' },
  catalogEntry: { type: 'AIToolCatalog', required: false, delete: 'restrict',
    note: 'Link to pre-populated catalog (null = custom tool)' },

  // Step 1: Basic Info
  name: { type: 'string', length: { max: 255 } },
  description: { type: 'text' },
  vendorName: { type: 'string', length: { max: 255 } },
  vendorCountry: {
    type: 'string', length: { min: 2, max: 2 },
    required: false,
  },
  vendorUrl: { type: 'string', required: false },

  // Step 2: Usage Context (Art. 26 — deployer obligations)
  // AITool = use case (Anwendungsfall), NOT a software product.
  // One product (e.g. ChatGPT) may have multiple AITool records
  // if used for different purposes with different affected persons.
  purpose: { type: 'string', length: { max: 2000 } },
  useCaseDetails: {
    type: 'text', required: false,
    note: 'Detailed use case description: what decisions, what process, what output (Art. 26)',
  },
  domain: {
    enum: ['biometrics', 'critical_infrastructure', 'education',
      'employment', 'essential_services', 'law_enforcement',
      'migration', 'justice', 'customer_service', 'marketing',
      'coding', 'analytics', 'other'],
  },
  decisionImpact: {
    enum: ['no_impact', 'advisory', 'significant', 'sole_decision'],
    default: 'advisory',
    note: 'Impact of AI on decisions about natural persons (Art. 26(2))',
  },
  deploymentDate: {
    type: 'date', required: false,
    note: 'When the tool started being used in this use case',
  },

  // Step 3: Data & Users
  dataTypes: {
    type: 'json',
    note: 'Array: personal, sensitive, biometric, health, financial',
  },
  affectedPersons: {
    type: 'json',
    note: 'Array: employees, customers, applicants, patients',
  },
  vulnerableGroups: { type: 'boolean', default: false },
  dataResidency: { type: 'string', required: false, note: 'EU/US/unknown' },
  employeesInformed: {
    type: 'boolean', default: false,
    note: 'Art. 26(7): Were employees/worker representatives informed about AI usage?',
  },

  // Technical Stack (CLI passport + wizard)
  framework: { type: 'string', length: { max: 100 }, required: false },
  modelProvider: { type: 'string', length: { max: 100 }, required: false },
  modelId: { type: 'string', length: { max: 255 }, required: false },

  // Step 4: Autonomy & Oversight
  autonomyLevel: {
    enum: ['advisory', 'semi_autonomous', 'autonomous'],
  },
  humanOversight: { type: 'boolean', default: true },
  affectsNaturalPersons: 'boolean',

  // Step 5: Classification Result
  riskLevel: {
    enum: ['prohibited', 'high', 'gpai', 'limited', 'minimal'],
    required: false,
    index: true,
  },
  annexCategory: { type: 'string', required: false },
  classificationConfidence: { type: 'number', required: false },

  // Compliance Tracking
  complianceStatus: {
    enum: [
      'not_started', 'in_progress', 'review',
      'compliant', 'non_compliant',
    ],
    default: 'not_started',
    index: true,
  },
  complianceScore: { type: 'number', default: 0 },

  // Wizard State
  wizardStep: { type: 'number', default: 1 },
  wizardCompleted: { type: 'boolean', default: false },

  // CLI sync metadata (detectionPatterns, versions, signature, extendedFields)
  syncMetadata: { type: 'json', required: false },
});
