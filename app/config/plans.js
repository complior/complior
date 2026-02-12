'use strict';

// Plan limits — single source of truth
// Used by: app/seeds/plans.js, SubscriptionLimitChecker (reads from DB after seed)
// To change limits: update here → re-seed or write migration UPDATE
// Convention: -1 = unlimited, 0 = blocked

const plans = [
  {
    name: 'free',
    displayName: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    maxTools: 5,
    maxUsers: 1,
    maxEmployees: 0,
    features: { quickCheck: true, eva: -1, newsletter: true },
    active: true,
    sortOrder: 0,
  },
  {
    name: 'starter',
    displayName: 'Starter',
    priceMonthly: 4900,
    priceYearly: 46800,
    maxTools: 15,
    maxUsers: 3,
    maxEmployees: 0,
    features: { literacy: true, eva: -1, classification: 'full' },
    active: true,
    sortOrder: 1,
  },
  {
    name: 'growth',
    displayName: 'Growth',
    priceMonthly: 14900,
    priceYearly: 142800,
    maxTools: 25,
    maxUsers: 10,
    maxEmployees: 0,
    features: {
      literacy: true,
      fria: true,
      eva: -1,
      gapAnalysis: true,
      siegel: true,
      documents: 'full',
    },
    active: true,
    sortOrder: 2,
  },
  {
    name: 'scale',
    displayName: 'Scale',
    priceMonthly: 39900,
    priceYearly: 382800,
    maxTools: 100,
    maxUsers: 50,
    maxEmployees: 0,
    features: {
      literacy: true,
      fria: true,
      eva: -1,
      gapAnalysis: true,
      autoDiscovery: true,
      api: true,
      monitoring: true,
      siegel: true,
      documents: 'full',
    },
    active: true,
    sortOrder: 3,
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    priceMonthly: -1,
    priceYearly: -1,
    maxTools: -1,
    maxUsers: -1,
    maxEmployees: -1,
    features: {
      all: true,
      onPremise: true,
      sla: true,
      whiteLabel: true,
    },
    active: true,
    sortOrder: 4,
  },
];

module.exports = plans;
