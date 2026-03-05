({
  Entity: {},
  deviceCode: { type: 'string', unique: true, index: true },
  userCode: { type: 'string', index: true },
  user: { type: 'User', required: false, delete: 'restrict' },
  organization: { type: 'Organization', required: false, delete: 'cascade' },
  status: {
    enum: ['pending', 'authorized', 'expired', 'used'],
    default: 'pending',
  },
  scope: { type: 'string', default: 'sync:read sync:write' },
  expiresAt: { type: 'datetime' },
  authorizedAt: { type: 'datetime', required: false },
})
