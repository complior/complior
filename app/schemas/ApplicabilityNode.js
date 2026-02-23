({
  Entity: {},

  nodeId: { type: 'string', length: { max: 50 }, unique: true },
  jurisdictionId: { type: 'string', length: { max: 50 }, index: true },
  questionId: { type: 'string', length: { max: 50 }, required: false },
  question: { type: 'text' },
  answers: { type: 'json', required: false },
  isRoot: { type: 'boolean', default: false },
})
