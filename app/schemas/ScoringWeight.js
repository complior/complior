({
  Entity: {},
  category: { type: 'string', length: { max: 50 }, unique: true },
  weight: { type: 'decimal' },
  label: { type: 'string', length: { max: 100 } },
  regulation: { type: 'string', length: { max: 100 }, default: 'eu-ai-act' },
});
