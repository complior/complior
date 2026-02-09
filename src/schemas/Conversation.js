({
  Entity: {},

  user: { type: 'User', delete: 'cascade' },
  aiTool: { type: 'AITool', delete: 'cascade', required: false,
    note: 'Context-specific conversation (null = general chat)' },
  title: { type: 'string', length: { max: 255 }, default: "'Neues Gespräch'" },
  context: {
    enum: ['general', 'classification', 'compliance', 'document', 'gap_analysis'],
    default: 'general',
  },
  metadata: { type: 'json', required: false },
  archived: { type: 'boolean', default: false },
});
