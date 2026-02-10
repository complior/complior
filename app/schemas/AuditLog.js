({
  Entity: {},

  user: { type: 'User', delete: 'restrict' },
  organization: { type: 'Organization', delete: 'cascade' },
  action: {
    enum: ['create', 'read', 'update', 'delete', 'classify', 'generate',
      'approve', 'export', 'login', 'logout'],
  },
  resource: { type: 'string' },
  resourceId: { type: 'number' },
  oldData: { type: 'json', required: false },
  newData: { type: 'json', required: false },
  ip: 'ip',
  userAgent: { type: 'string', required: false },
  createdAt: { type: 'datetime', default: 'now()' },
});
