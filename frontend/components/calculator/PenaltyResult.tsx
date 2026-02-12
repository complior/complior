import { AlertTriangle, ShieldAlert, FileWarning } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface PenaltyTier {
  label: string;
  article: string;
  percentage: number;
  minimum: number;
  calculated: number;
  icon: React.ReactNode;
  color: string;
  barColor: string;
}

interface PenaltyResultProps {
  revenue: number;
}

const fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function computeTiers(revenue: number): PenaltyTier[] {
  return [
    {
      label: 'Prohibited AI Practices',
      article: 'Art. 5',
      percentage: 7,
      minimum: 35_000_000,
      calculated: Math.max(revenue * 0.07, 35_000_000),
      icon: <ShieldAlert className="h-5 w-5" />,
      color: 'text-red-600',
      barColor: 'bg-red-500',
    },
    {
      label: 'High-Risk Violations',
      article: 'Art. 6–49',
      percentage: 3,
      minimum: 15_000_000,
      calculated: Math.max(revenue * 0.03, 15_000_000),
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-amber-600',
      barColor: 'bg-amber-500',
    },
    {
      label: 'Other Violations',
      article: 'Other provisions',
      percentage: 1.5,
      minimum: 7_500_000,
      calculated: Math.max(revenue * 0.015, 7_500_000),
      icon: <FileWarning className="h-5 w-5" />,
      color: 'text-blue-600',
      barColor: 'bg-blue-500',
    },
  ];
}

export function PenaltyResult({ revenue }: PenaltyResultProps) {
  const tiers = computeTiers(revenue);
  const maxPenalty = tiers[0].calculated;

  return (
    <div className="space-y-4">
      {tiers.map((tier) => {
        const barWidth = maxPenalty > 0 ? (tier.calculated / maxPenalty) * 100 : 0;
        const isMinimum = revenue * (tier.percentage / 100) < tier.minimum;

        return (
          <Card key={tier.label}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className={tier.color}>{tier.icon}</span>
                <CardTitle className="text-base">{tier.label}</CardTitle>
              </div>
              <p className="text-xs text-slate-500 mt-1">{tier.article}</p>
            </CardHeader>
            <CardContent>
              <p className={cn('text-2xl font-bold mb-2', tier.color)}>
                {fmt.format(tier.calculated)}
              </p>
              <div className="h-3 w-full rounded-full bg-slate-100 mb-3">
                <div
                  className={cn('h-3 rounded-full transition-all duration-500', tier.barColor)}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                {tier.percentage}% of turnover ({fmt.format(revenue * (tier.percentage / 100))})
                {' or '}
                {fmt.format(tier.minimum)} minimum
                {isMinimum && (
                  <span className="ml-1 font-medium text-slate-700">— minimum applies</span>
                )}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
