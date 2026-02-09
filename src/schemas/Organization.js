({
  Registry: {},

  name: { type: 'string', length: { max: 255 }, unique: true },
  industry: {
    enum: ['fintech', 'hrtech', 'healthtech', 'edtech', 'ecommerce',
      'manufacturing', 'logistics', 'legal', 'insurance', 'other'],
  },
  size: {
    enum: ['micro_1_9', 'small_10_49', 'medium_50_249', 'large_250_plus'],
  },
  country: {
    type: 'string', length: { min: 2, max: 2 },
    note: 'ISO 3166-1 alpha-2',
  },
  website: { type: 'string', required: false },
  vatId: { type: 'string', required: false, note: 'EU VAT number' },
  settings: {
    type: 'json', required: false,
    note: 'Organization-level settings',
  },
});
