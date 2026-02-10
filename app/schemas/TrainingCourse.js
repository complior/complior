({
  Entity: {},

  title: { type: 'string', length: { max: 255 } },
  slug: { type: 'string', unique: true, note: 'URL-friendly identifier' },
  roleTarget: {
    enum: ['ceo_executive', 'hr_manager', 'developer', 'general_employee'],
  },
  durationMinutes: { type: 'number' },
  contentType: {
    enum: ['interactive', 'video', 'text', 'quiz'],
    default: 'interactive',
  },
  description: { type: 'text' },
  language: { type: 'string', length: { max: 5 }, default: '\'en\'' },
  version: { type: 'number', default: 1 },
  active: { type: 'boolean', default: true },
  sortOrder: { type: 'number', default: 0 },
});
