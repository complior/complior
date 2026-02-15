'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PricingToggle } from '@/components/pricing/PricingToggle';
import { PlanCard } from '@/components/pricing/PlanCard';
import { FeatureComparisonTable } from '@/components/pricing/FeatureComparisonTable';
import { PricingFAQ } from '@/components/pricing/PricingFAQ';

const plans = [
  { name: 'free', priceMonthly: 0, priceYearly: 0, trialDays: 0, maxTools: 1, maxUsers: 1 },
  { name: 'starter', priceMonthly: 4900, priceYearly: 47040, trialDays: 14, maxTools: 5, maxUsers: 2 },
  { name: 'growth', priceMonthly: 14900, priceYearly: 143040, trialDays: 14, maxTools: 20, maxUsers: 10, recommended: true },
  { name: 'scale', priceMonthly: 39900, priceYearly: 383040, trialDays: 14, maxTools: -1, maxUsers: -1 },
  { name: 'enterprise', priceMonthly: -1, priceYearly: -1, trialDays: 0, maxTools: -1, maxUsers: -1, enterprise: true },
] as const;

export default function PricingPage() {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const locale = useLocale();
  const t = useTranslations('pricing');

  const planNames: Record<string, string> = {
    free: t('freeName'), starter: t('starterName'), growth: t('growthName'),
    scale: t('scaleName'), enterprise: t('enterpriseName'),
  };

  const planFeatures: Record<string, string[]> = {
    free: t.raw('freeFeatures') as string[],
    starter: t.raw('starterFeatures') as string[],
    growth: t.raw('growthFeatures') as string[],
    scale: t.raw('scaleFeatures') as string[],
    enterprise: t.raw('enterpriseFeatures') as string[],
  };

  return (
    <div className="mx-auto max-w-ctr px-8 py-16">
      <SectionHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="mb-10">
        <PricingToggle period={period} onToggle={setPeriod} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-20">
        {plans.map((plan) => (
          <PlanCard
            key={plan.name}
            name={plan.name}
            displayName={planNames[plan.name]}
            priceMonthly={plan.priceMonthly}
            priceYearly={plan.priceYearly}
            period={period}
            features={planFeatures[plan.name]}
            maxTools={plan.maxTools}
            maxUsers={plan.maxUsers}
            recommended={'recommended' in plan && plan.recommended === true}
            enterprise={'enterprise' in plan && plan.enterprise === true}
            trialDays={plan.trialDays}
          />
        ))}
      </div>

      <div id="comparison" className="mb-20">
        <h2 className="font-display text-2xl font-bold text-[var(--dark)] text-center mb-8">
          {t('fullComparison')}
        </h2>
        <FeatureComparisonTable />
      </div>

      <div className="mb-16">
        <h2 className="font-display text-2xl font-bold text-[var(--dark)] text-center mb-8">
          {t('faqTitle')}
        </h2>
        <PricingFAQ />
      </div>
    </div>
  );
}
