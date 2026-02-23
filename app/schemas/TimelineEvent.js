({
  Entity: {},

  eventId: { type: 'string', length: { max: 50 }, unique: true },
  jurisdictionId: { type: 'string', length: { max: 50 }, index: true },
  phase: { type: 'string', length: { max: 255 } },
  date: { type: 'date' },
  whatApplies: { type: 'text', required: false },
  status: { enum: ['upcoming', 'in-force', 'completed'] },
  monitoringUrl: { type: 'string', length: { max: 500 }, required: false },
})
