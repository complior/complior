({
  Entity: {},

  mappingId: { type: 'string', length: { max: 50 }, unique: true },
  sourceJurisdiction: { type: 'string', length: { max: 50 } },
  targetJurisdiction: { type: 'string', length: { max: 50 } },
  sourceObligationId: { type: 'string', length: { max: 50 }, required: false },
  targetObligationId: { type: 'string', length: { max: 50 }, required: false },
  relationship: { enum: ['equivalent', 'stricter', 'subset', 'superset'] },
})
