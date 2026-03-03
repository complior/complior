({
  Entity: {},

  organization: { type: 'Organization', delete: 'cascade' },
  aiTool: { type: 'AITool', delete: 'cascade' },
  createdBy: { type: 'User', delete: 'restrict' },
  status: {
    enum: ['draft', 'in_progress', 'review', 'completed'],
    default: 'draft',
  },
  affectedPersons: {
    type: 'json',
    note: 'Array: employees, customers, applicants',
  },
  risks: {
    type: 'json',
    note: '{ category, description, severity, likelihood }',
  },
  oversightMeasures: {
    type: 'json',
    note: 'Array: human oversight measures',
  },
  mitigation: {
    type: 'json',
    note: '{ risk, measure, responsible, deadline }',
  },
  gdpiaDraftImport: { type: 'json', required: false,
    note: 'Pre-fill from existing GDPR DPIA' },
  completedAt: { type: 'datetime', required: false },
  approvedBy: { type: 'User', required: false, delete: 'restrict' },
  fileUrl: {
    type: 'string', required: false,
    note: 'PDF export URL (Hetzner S3)',
  },
});
