'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

const PLAN_DETAILS: Record<string, { price: string; features: string[] }> = {
  starter: {
    price: '€49/mo',
    features: ['5 AI tools', '2 users', 'Full classification', '200 Eva queries/mo'],
  },
  growth: {
    price: '€149/mo',
    features: ['20 AI tools', '10 users', 'FRIA & gap analysis', '1,000 Eva queries/mo'],
  },
  scale: {
    price: '€399/mo',
    features: ['Unlimited AI tools', 'Unlimited users', 'API access', 'Real-time monitoring'],
  },
};

interface TrialConfirmationProps {
  planName: string;
  period: 'monthly' | 'yearly';
  onContinueFree: () => void;
}

export function TrialConfirmation({ planName, period, onContinueFree }: TrialConfirmationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const details = PLAN_DETAILS[planName];

  const handleStartTrial = async () => {
    setLoading(true);
    setError(null);
    try {
      const { checkoutUrl } = await api.billing.createCheckout(planName, period);
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoading(false);
    }
  };

  if (!details) return null;

  const displayName = planName.charAt(0).toUpperCase() + planName.slice(1);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Badge className="mb-3">{displayName} Plan</Badge>
        <p className="text-2xl font-bold text-slate-900">{details.price}</p>
        <p className="text-sm text-slate-500 mt-1">14-day free trial</p>
      </div>

      <ul className="space-y-2">
        {details.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
            <Check className="h-4 w-4 text-green-600 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
        <div className="flex items-start gap-2">
          <CreditCard className="h-4 w-4 mt-0.5 text-slate-500" />
          <p className="text-xs text-slate-600">
            A payment method is required to start your trial. You won&apos;t be charged until the 14-day trial ends. Cancel anytime.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleStartTrial} disabled={loading} className="w-full" size="lg">
        {loading ? 'Redirecting...' : 'Start 14-Day Free Trial'}
      </Button>

      <button
        type="button"
        onClick={onContinueFree}
        className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
      >
        Continue with Free Plan
      </button>
    </div>
  );
}
