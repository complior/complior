({
  Entity: {},

  apiKey: { type: 'ApiKey', delete: 'cascade' },
  usageDate: { type: 'string', length: { max: 10 } },
  requestCount: { type: 'number', default: 0 },
  bytesTransferred: { type: 'number', default: 0 },
  naturalKey: { unique: ['apiKey', 'usageDate'] },
})
