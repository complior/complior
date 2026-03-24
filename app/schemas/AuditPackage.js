({
  Entity: {},
  organization: { type: 'Organization', delete: 'cascade' },
  createdBy: { type: 'User', delete: 'restrict' },
  status: {
    enum: ['queued', 'generating', 'ready', 'error', 'expired'],
    default: 'queued',
  },
  fileUrl: { type: 'string', required: false },
  fileSize: { type: 'number', required: false },
  toolCount: { type: 'number', default: 0 },
  documentCount: { type: 'number', default: 0 },
  metadata: { type: 'json', required: false },
  expiresAt: { type: 'datetime', required: false },
  errorMessage: { type: 'string', required: false },
  createdAt: { type: 'datetime', default: 'now()' },
});
