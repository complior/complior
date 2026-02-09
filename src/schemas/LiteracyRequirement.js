({
  Entity: {},

  organization: { type: 'Organization', delete: 'cascade' },
  roleTarget: {
    enum: ['ceo_executive', 'hr_manager', 'developer', 'general_employee'],
  },
  requiredCourses: { type: 'json', note: 'Array of courseIds' },
  deadline: { type: 'datetime', required: false },
  naturalKey: { unique: ['organization', 'roleTarget'] },
});
