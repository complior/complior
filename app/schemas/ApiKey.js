({
  Entity: {},

  organization: { type: 'Organization', delete: 'cascade' },
  keyHash: { type: 'string', unique: true },
  keyPrefix: { type: 'string', length: { max: 12 } },
  name: { type: 'string', length: { max: 255 } },
  plan: { type: 'string', length: { max: 50 } },
  rateLimit: { type: 'number', default: 100 },
  lastUsedAt: { type: 'datetime', required: false },
  expiresAt: { type: 'datetime', required: false },
  active: { type: 'boolean', default: true },
})
