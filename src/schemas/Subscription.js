({
  Entity: {},

  organization: { type: 'Organization', delete: 'cascade' },
  plan: { type: 'Plan', delete: 'restrict' },
  stripeCustomerId: { type: 'string', required: false },
  stripeSubscriptionId: { type: 'string', required: false, unique: true },
  status: {
    enum: ['trialing', 'active', 'past_due', 'canceled', 'unpaid'],
    default: 'active',
  },
  currentPeriodStart: 'datetime',
  currentPeriodEnd: 'datetime',
  canceledAt: { type: 'datetime', required: false },
});
