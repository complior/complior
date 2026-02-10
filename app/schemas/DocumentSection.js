({
  Details: {},

  document: { type: 'ComplianceDocument', delete: 'cascade' },
  sectionCode: { type: 'string' },
  title: { type: 'string', length: { max: 500 } },
  content: { type: 'json', note: 'Tiptap JSON content (rich text)' },
  aiDraft: { type: 'json', required: false },
  status: {
    enum: ['empty', 'ai_generated', 'editing', 'reviewed', 'approved'],
    default: 'empty',
  },
  sortOrder: { type: 'number', default: 0 },
  naturalKey: { unique: ['document', 'sectionCode'] },
});
