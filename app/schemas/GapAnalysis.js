({
  Entity: {},

  organization: { type: 'Organization', delete: 'cascade' },
  aiTool: { type: 'AITool', delete: 'cascade' },
  createdBy: { type: 'User', delete: 'restrict' },
  overallScore: { type: 'number' },
  categories: { type: 'json' },
  actionPlan: { type: 'json' },
  version: { type: 'number', default: 1 },
});
