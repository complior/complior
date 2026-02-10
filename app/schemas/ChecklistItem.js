({
  Entity: {},

  aiTool: { type: 'AITool', delete: 'cascade' },
  requirement: { type: 'Requirement', delete: 'restrict', required: false },
  title: { type: 'string', length: { max: 500 } },
  description: { type: 'string', required: false },
  completed: { type: 'boolean', default: false },
  completedAt: { type: 'datetime', required: false },
  completedBy: { type: 'User', required: false, delete: 'restrict' },
  sortOrder: { type: 'number', default: 0 },
});
