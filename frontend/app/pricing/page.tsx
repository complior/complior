'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { PricingToggle } from '@/components/pricing/PricingToggle';
import { PlanCard } from '@/components/pricing/PlanCard';
import { FeatureComparisonTable } from '@/components/pricing/FeatureComparisonTable';
import { PricingFAQ } from '@/components/pricing/PricingFAQ';

const plans = [
  {
    name: 'free',
    displayName: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    trialDays: 0,
    maxTools: 1,
    maxUsers: 1,
    features: [
      'Basic risk classification',
      'Quick Check assessment',
      'AI Act newsletter',
      '1 AI tool',
      '1 user',
    ],
  },
  {
    name: 'starter',
    displayName: 'Starter',
    priceMonthly: 4900,
    priceYearly: 47040,
    trialDays: 14,
    maxTools: 5,
    maxUsers: 2,
    features: [
      'Full risk classification',
      'AI Literacy tracking',
      'Compliance timeline',
      '200 Eva AI queries/mo',
      'Basic CSV import',
      'Up to 15 employees',
    ],
  },
  {
    name: 'growth',
    displayName: 'Growth',
    priceMonthly: 14900,
    priceYearly: 143040,
    trialDays: 14,
    maxTools: 20,
    maxUsers: 10,
    recommended: true,
    features: [
      'FRIA & gap analysis',
      'Full compliance documents',
      'Compliance badge',
      '1,000 Eva AI queries/mo',
      'Full CSV import & export',
      'Employee self-registration',
      'Up to 50 employees',
    ],
  },
  {
    name: 'scale',
    displayName: 'Scale',
    priceMonthly: 39900,
    priceYearly: 383040,
    trialDays: 14,
    maxTools: -1,
    maxUsers: -1,
    features: [
      'Everything in Growth',
      'API access',
      'Auto-discovery',
      'Real-time monitoring',
      'Unlimited Eva AI queries',
      'Up to 250 employees',
    ],
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    priceMonthly: -1,
    priceYearly: -1,
    trialDays: 0,
    maxTools: -1,
    maxUsers: -1,
    enterprise: true,
    features: [
      'Everything in Scale',
      'On-premise deployment',
      'SLA guarantee',
      'White-label option',
      'Unlimited employees',
      'Dedicated support',
    ],
  },
] as const;

export default function PricingPage() {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <Shield className="h-6 w-6 text-primary-600" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Choose the plan that fits your AI compliance needs. All paid plans include a 14-day free trial.
        </p>
      </div>

      {/* Toggle */}
      <div className="mb-10">
        <PricingToggle period={period} onToggle={setPeriod} />
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 max-w-7xl mx-auto mb-20">
        {plans.map((plan) => (
          <PlanCard
            key={plan.name}
            name={plan.name}
            displayName={plan.displayName}
            priceMonthly={plan.priceMonthly}
            priceYearly={plan.priceYearly}
            period={period}
            features={[...plan.features]}
            maxTools={plan.maxTools}
            maxUsers={plan.maxUsers}
            recommended={'recommended' in plan && plan.recommended === true}
            enterprise={'enterprise' in plan && plan.enterprise === true}
            trialDays={plan.trialDays}
          />
        ))}
      </div>

      {/* Feature Comparison */}
      <div id="comparison" className="mb-20">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
          Full Plan Comparison
        </h2>
        <FeatureComparisonTable />
      </div>

      {/* FAQ */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
          Frequently Asked Questions
        </h2>
        <PricingFAQ />
      </div>
    </div>
  );
}
