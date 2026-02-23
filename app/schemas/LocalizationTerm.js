({
  Entity: {},

  termId: { type: 'string', length: { max: 50 }, unique: true },
  jurisdictionId: { type: 'string', length: { max: 50 }, index: true },
  termKey: { type: 'string', length: { max: 100 }, index: true },
  language: { type: 'string', length: { max: 5 } },
  translation: { type: 'string', length: { max: 500 } },
  culturalNote: { type: 'text', required: false },
})
