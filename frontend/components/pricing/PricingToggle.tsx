'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface PricingToggleProps {
  period: 'monthly' | 'yearly';
  onToggle: (period: 'monthly' | 'yearly') => void;
}

export function PricingToggle({ period, onToggle }: PricingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => onToggle('monthly')}
        className={cn(
          'text-sm font-medium transition-colors',
          period === 'monthly' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => onToggle(period === 'monthly' ? 'yearly' : 'monthly')}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        role="switch"
        aria-checked={period === 'yearly'}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
            period === 'yearly' ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
      <button
        onClick={() => onToggle('yearly')}
        className={cn(
          'text-sm font-medium transition-colors',
          period === 'yearly' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
        )}
      >
        Annual
      </button>
      <Badge className="bg-green-100 text-green-700 border-green-200">Save 2 months</Badge>
    </div>
  );
}
