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
  vendorCountry: { type: 'string', length: { min: 2, max: 2 }, required: false },
  vendorUrl: { type: 'string', required: false },

  // Step 2: Usage Context
  purpose: { type: 'string', length: { max: 2000 } },
  domain: {
    enum: ['biometrics', 'critical_infrastructure', 'education',
           'employment', 'essential_services', 'law_enforcement',
           'migration', 'justice', 'customer_service', 'marketing',
           'coding', 'analytics', 'other'],
  },

  // Step 3: Data & Users
  dataTypes: { type: 'json', note: 'Array: personal, sensitive, biometric, health, financial' },
  affectedPersons: { type: 'json', note: 'Array: employees, customers, applicants, patients' },
  vulnerableGroups: { type: 'boolean', default: false },
  dataResidency: { type: 'string', required: false, note: 'EU/US/unknown' },

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
    enum: ['not_started', 'in_progress', 'review', 'compliant', 'non_compliant'],
    default: 'not_started',
    index: true,
  },
  complianceScore: { type: 'number', default: 0 },

  // Wizard State
  wizardStep: { type: 'number', default: 1 },
  wizardCompleted: { type: 'boolean', default: false },
});
