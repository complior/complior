({
  Entity: {},

  organization: { type: 'Organization', delete: 'cascade' },
  aiTool: { type: 'AITool', delete: 'cascade', required: false,
    note: 'null = discovered but not yet registered' },
  toolName: { type: 'string', length: { max: 255 } },
  source: {
    enum: ['manual', 'csv_import', 'dns_scan', 'browser_extension', 'oauth_audit'],
  },
  status: {
    enum: ['pending', 'classified', 'dismissed', 'merged'],
    default: 'pending',
  },
  metadata: { type: 'json', required: false },
  discoveredAt: 'datetime',
  processedBy: { type: 'User', required: false, delete: 'restrict' },
});
