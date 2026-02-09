({
  Details: {},

  aiTool: { type: 'AITool', delete: 'cascade' },
  classification: { type: 'RiskClassification', delete: 'cascade' },
  action: {
    enum: ['initial', 'reclassification', 'system_updated', 'regulation_changed'],
  },
  previousRiskLevel: { type: 'string', required: false },
  newRiskLevel: 'string',
  changedBy: { type: 'User', delete: 'restrict' },
  reason: { type: 'string', required: false },
});
