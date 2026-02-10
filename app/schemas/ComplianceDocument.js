({
  Entity: {},

  aiTool: { type: 'AITool', delete: 'cascade' },
  createdBy: { type: 'User', delete: 'restrict' },
  documentType: {
    enum: ['fria', 'monitoring_plan', 'usage_policy', 'employee_notification',
      'incident_report', 'risk_assessment', 'transparency_notice'],
  },
  title: { type: 'string', length: { max: 500 } },
  version: { type: 'number', default: 1 },
  status: {
    enum: ['draft', 'generating', 'review', 'approved', 'archived'],
    default: 'draft',
  },
  approvedBy: { type: 'User', required: false, delete: 'restrict' },
  approvedAt: { type: 'datetime', required: false },
  fileUrl: { type: 'string', required: false, note: 'S3 URL for exported PDF' },
  metadata: { type: 'json', required: false },
});
