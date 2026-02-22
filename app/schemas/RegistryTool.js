({
  Entity: {},

  name: { type: 'string', length: { max: 255 }, unique: true },
  provider: { type: 'string', length: { max: 255 } },
  category: {
    enum: ['chatbot', 'recruitment', 'coding', 'analytics', 'customer_service',
      'marketing', 'writing', 'image_generation', 'video', 'translation',
      'medical', 'legal', 'finance', 'education', 'api_platform', 'other'],
  },
  riskLevel: {
    enum: ['prohibited', 'high', 'gpai', 'limited', 'minimal'],
  },
  description: { type: 'text', required: false },
  websiteUrl: { type: 'string', required: false },
  vendorCountry: { type: 'string', length: { min: 2, max: 2 }, required: false },
  dataResidency: { type: 'string', required: false },
  capabilities: { type: 'json', required: false },
  jurisdictions: { type: 'json', required: false },
  detectionPatterns: { type: 'json', required: false },
  evidence: { type: 'json', required: false },
  active: { type: 'boolean', default: true },
})
