({
  Details: {},

  fria: { type: 'FRIAAssessment', delete: 'cascade' },
  sectionType: {
    enum: ['general_info', 'affected_persons', 'specific_risks',
      'human_oversight', 'mitigation_measures', 'monitoring_plan'],
  },
  content: { type: 'json' },
  aiDraft: { type: 'json', required: false },
  completed: { type: 'boolean', default: false },
  sortOrder: { type: 'number', default: 0 },
  naturalKey: { unique: ['fria', 'sectionType'] },
});
