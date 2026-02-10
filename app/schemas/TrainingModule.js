({
  Details: {},

  course: { type: 'TrainingCourse', delete: 'cascade' },
  sortOrder: { type: 'number', default: 0 },
  title: { type: 'string', length: { max: 255 } },
  contentMarkdown: { type: 'text' },
  quizQuestions: { type: 'json', required: false,
    note: 'Array of { question, options[], correctAnswer, explanation }' },
  durationMinutes: { type: 'number', default: 10 },
  naturalKey: { unique: ['course', 'sortOrder'] },
});
