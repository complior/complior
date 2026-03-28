({
  Entity: {},
  email: { type: 'string', length: { max: 255 }, unique: true },
  source: { enum: ['report_download', 'quick_check', 'scanner', 'classification'] },
  metadata: { type: 'json', required: false },
  lastActivityAt: { type: 'datetime', default: 'now()' },
})
