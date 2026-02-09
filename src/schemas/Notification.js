({
  Entity: {},

  organization: { type: 'Organization', delete: 'cascade' },
  user: { type: 'User', delete: 'cascade' },
  type: {
    enum: ['classification_complete', 'document_ready', 'deadline_approaching',
      'regulatory_update', 'compliance_change', 'system_alert',
      'ai_tool_discovered', 'literacy_overdue', 'fria_required',
      'risk_threshold_exceeded'],
  },
  title: { type: 'string', length: { max: 255 } },
  message: { type: 'string', length: { max: 1000 } },
  link: { type: 'string', required: false },
  read: { type: 'boolean', default: false },
  readAt: { type: 'datetime', required: false },
});
