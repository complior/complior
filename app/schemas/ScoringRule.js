({
  Entity: {},

  regulation: { type: 'string', length: { max: 100 } },
  checkId: { type: 'string', unique: true },
  weight: { type: 'number' },
  maxScore: { type: 'number' },
  riskLevel: {
    enum: ['prohibited', 'high', 'gpai', 'limited', 'minimal'],
  },
  description: { type: 'text', required: false },
})
