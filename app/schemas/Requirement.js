({
  Entity: {},

  code: { type: 'string', unique: true },
  name: { type: 'string', length: { max: 255 } },
  description: { type: 'text' },
  articleReference: { type: 'string' },
  riskLevel: {
    enum: ['prohibited', 'high', 'gpai', 'limited', 'minimal'],
  },
  category: {
    enum: ['ai_literacy', 'deployer_obligations', 'fria', 'transparency',
      'human_oversight', 'monitoring', 'risk_management', 'data_governance',
      'record_keeping', 'registration', 'post_market_monitoring'],
  },
  sortOrder: { type: 'number', default: 0 },
  estimatedEffortHours: { type: 'number', required: false },
  guidance: { type: 'string', required: false },
  translations: { type: 'json', required: false },
  obligationIds: { type: 'json', required: false },
});
