({
  Entity: {},

  name: { type: 'string', length: { max: 255 }, unique: true },
  vendor: { type: 'string', length: { max: 255 } },
  vendorCountry: {
    type: 'string', length: { min: 2, max: 2 },
    required: false,
  },
  category: {
    enum: ['chatbot', 'recruitment', 'coding', 'analytics', 'customer_service',
      'marketing', 'writing', 'image_generation', 'video', 'translation',
      'medical', 'legal', 'finance', 'education', 'api_platform', 'other'],
  },
  defaultRiskLevel: {
    enum: ['high', 'limited', 'minimal'],
    required: false,
  },
  domains: { type: 'json', note: 'Array of Annex III domains' },
  description: { type: 'text', required: false },
  websiteUrl: { type: 'string', required: false },
  dataResidency: { type: 'string', required: false, note: 'EU/US/global' },
  active: { type: 'boolean', default: true },
});
