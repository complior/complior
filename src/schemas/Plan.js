({
  Entity: {},

  name: { type: 'string', unique: true },
  displayName: { type: 'string' },
  priceMonthly: { type: 'number', note: 'Cents (EUR). 0 = free' },
  priceYearly: { type: 'number', required: false },
  maxTools: { type: 'number', note: '-1 = unlimited' },
  maxUsers: { type: 'number', note: '-1 = unlimited' },
  maxEmployees: { type: 'number', note: '-1 = unlimited (AI Literacy tracking)' },
  features: { type: 'json' },
  stripePriceId: { type: 'string', required: false },
  active: { type: 'boolean', default: true },
  sortOrder: { type: 'number', default: 0 },
});
