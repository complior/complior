({
  Entity: {},

  jurisdictionId: { type: 'string', length: { max: 50 }, unique: true },
  officialName: { type: 'string', length: { max: 255 } },
  jurisdiction: { type: 'string', length: { max: 100 } },
  status: { enum: ['in-force', 'draft', 'proposed'] },
  enactedDate: { type: 'date', required: false },
  entryIntoForceDate: { type: 'date', required: false },
  maxPenalty: { type: 'text', required: false },
  riskLevels: { type: 'json', required: false },
  keyDefinitions: { type: 'json', required: false },
  roles: { type: 'json', required: false },
  classificationQuestions: { type: 'json', required: false },
})
