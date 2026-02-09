({
  Entity: {},

  regulatoryUpdate: { type: 'RegulatoryUpdate', delete: 'cascade' },
  aiTool: { type: 'AITool', delete: 'cascade' },
  impactLevel: {
    enum: ['none', 'low', 'medium', 'high', 'critical'],
  },
  description: { type: 'string', length: { max: 2000 } },
  actionRequired: { type: 'boolean', default: false },
  acknowledged: { type: 'boolean', default: false },
  acknowledgedBy: { type: 'User', required: false, delete: 'restrict' },
});
