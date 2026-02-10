({
  Relation: {},

  aiTool: { type: 'AITool', delete: 'cascade' },
  requirement: { type: 'Requirement', delete: 'restrict' },
  status: {
    enum: ['not_applicable', 'pending', 'in_progress', 'completed', 'blocked'],
    default: 'pending',
  },
  progress: { type: 'number', default: 0 },
  dueDate: { type: 'datetime', required: false },
  notes: { type: 'string', required: false },
  completedAt: { type: 'datetime', required: false },
  naturalKey: { unique: ['aiTool', 'requirement'] },
});
