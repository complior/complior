({
  Entity: {},

  requirementId: { type: 'string', length: { max: 50 }, unique: true },
  obligationId: { type: 'string', length: { max: 50 }, index: true },
  featureType: { type: 'string', length: { max: 100 }, required: false },
  sdkImplementation: { type: 'json', required: false },
  cliCheck: { type: 'json', required: false },
})
