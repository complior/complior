({
  Entity: {},
  organization: { type: 'Organization', delete: 'cascade' },
  user: { type: 'User', delete: 'restrict' },
  source: { enum: ['cli', 'api'], default: 'cli' },
  syncType: { enum: ['passport', 'scan', 'document', 'fria'] },
  status: { enum: ['success', 'conflict', 'error'] },
  toolSlug: { type: 'string' },
  conflicts: { type: 'json', required: false },
  metadata: { type: 'json', required: false },
});
