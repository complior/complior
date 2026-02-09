({
  Entity: {},

  user: { type: 'User', delete: 'cascade', required: false,
    note: 'null = employee without platform account (manual tracking)' },
  organization: { type: 'Organization', delete: 'cascade' },
  employeeName: { type: 'string', length: { max: 255 }, required: false },
  employeeEmail: { type: 'string', length: { max: 255 }, required: false },
  employeeRole: {
    enum: ['ceo_executive', 'hr_manager', 'developer', 'general_employee'],
    required: false,
  },
  course: { type: 'TrainingCourse', delete: 'restrict' },
  module: { type: 'TrainingModule', delete: 'restrict', required: false,
    note: 'null = course-level completion' },
  score: { type: 'number', required: false, note: '0-100 quiz score' },
  certificateUrl: { type: 'string', required: false },
  completedAt: { type: 'datetime', required: false },
  naturalKey: { unique: ['organization', 'course', 'module', 'user', 'employeeEmail'] },
});
