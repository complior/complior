import Link from 'next/link';
import { Check } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface PlanCardProps {
  name: string;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
  period: 'monthly' | 'yearly';
  features: string[];
  maxTools: number;
  maxUsers: number;
  recommended?: boolean;
  enterprise?: boolean;
  trialDays: number;
}

function formatPrice(cents: number): string {
  const euros = cents / 100;
  return euros % 1 === 0 ? `${euros}` : euros.toFixed(2);
}

export function PlanCard({
  name,
  displayName,
  priceMonthly,
  priceYearly,
  period,
  features,
  maxTools,
  maxUsers,
  recommended,
  enterprise,
  trialDays,
}: PlanCardProps) {
  const isYearly = period === 'yearly';
  const monthlyPrice = isYearly ? Math.round(priceYearly / 12) : priceMonthly;
  const isFree = priceMonthly === 0;

  const href = enterprise
    ? 'mailto:sales@aiact-compliance.eu'
    : `/auth/register?plan=${name}${!isFree ? `&period=${period}` : ''}`;

  const ctaText = enterprise
    ? 'Contact Sales'
    : isFree
      ? 'Get Started Free'
      : `Start ${trialDays}-Day Trial`;

  return (
    <Card
      className={cn(
        'flex flex-col relative',
        recommended && 'border-primary-600 border-2 shadow-lg'
      )}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge>Recommended</Badge>
        </div>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-lg">{displayName}</CardTitle>
        <div className="mt-4">
          {enterprise ? (
            <p className="text-3xl font-bold text-slate-900">Custom</p>
          ) : (
            <>
              <p className="text-4xl font-bold text-slate-900">
                {isFree ? '€0' : `€${formatPrice(monthlyPrice)}`}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {isFree ? 'Free forever' : 'per month'}
              </p>
              {isYearly && !isFree && (
                <p className="mt-0.5 text-xs text-green-600">
                  €{formatPrice(priceYearly)} billed annually
                </p>
              )}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-4">
        <div className="mb-4 text-center text-sm text-slate-600">
          <span className="font-medium">{maxTools === -1 ? 'Unlimited' : maxTools}</span>{' '}
          {maxTools === 1 ? 'AI tool' : 'AI tools'} &middot;{' '}
          <span className="font-medium">{maxUsers === -1 ? 'Unlimited' : maxUsers}</span>{' '}
          {maxUsers === 1 ? 'user' : 'users'}
        </div>
        <ul className="space-y-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="pt-4">
        {enterprise ? (
          <a href={href} className="w-full">
            <Button variant="secondary" className="w-full">
              {ctaText}
            </Button>
          </a>
        ) : (
          <Link href={href} className="w-full">
            <Button
              variant={recommended ? 'default' : 'secondary'}
              className="w-full"
            >
              {ctaText}
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
