'use client';

import { Suspense } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { RevenueInput } from '@/components/calculator/RevenueInput';
import { PenaltyResult } from '@/components/calculator/PenaltyResult';

function PenaltyContent() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('penalty');
  const searchParams = useSearchParams();

  const [revenue, setRevenue] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const paramRevenue = searchParams.get('revenue');
    if (paramRevenue) {
      const num = parseInt(paramRevenue, 10);
      if (!isNaN(num) && num > 0) {
        setRevenue(num);
        setShowResults(true);
      }
    }
  }, [searchParams]);

  const handleCalculate = useCallback(() => {
    if (revenue <= 0) return;
    setShowResults(true);
    router.replace(`/${locale}/penalty-calculator?revenue=${revenue}`, { scroll: false });
  }, [revenue, router, locale]);

  const handleRevenueChange = useCallback((val: number) => {
    setRevenue(val);
    if (showResults) setShowResults(false);
  }, [showResults]);

  const handleShare = () => {
    const url = `${window.location.origin}/${locale}/penalty-calculator?revenue=${revenue}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="mx-auto max-w-2xl px-8 py-16">
      <div className="text-center mb-10">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--teal-dim)]">
          <svg className="h-6 w-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--dark)] mb-3">
          {t('title')}
        </h1>
        <p className="text-[var(--dark4)]">{t('subtitle')}</p>
      </div>

      <div className="mb-6">
        <RevenueInput value={revenue} onChange={handleRevenueChange} />
      </div>
      <Button onClick={handleCalculate} disabled={revenue <= 0} className="w-full mb-10" size="xl">
        Calculate Penalties
      </Button>

      {showResults && revenue > 0 && (
        <div className="mb-12">
          <PenaltyResult revenue={revenue} />
          {showResults && (
            <div className="mt-4 text-center">
              <button onClick={handleShare} className="text-xs font-semibold text-teal hover:underline">
                {t('shareResult')}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-[var(--b2)] bg-[var(--card)] p-6 text-center">
        <h3 className="font-display text-lg font-bold text-[var(--dark)] mb-2">{t('ctaTitle')}</h3>
        <p className="text-sm text-[var(--dark4)] mb-4">{t('ctaDesc')}</p>
        <Link href={`/${locale}/auth/register?plan=growth`}>
          <Button>{t('ctaBtn')}</Button>
        </Link>
      </div>
    </div>
  );
}

export default function PenaltyCalculatorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center"><p className="text-[var(--dark5)]">Loading...</p></div>}>
      <PenaltyContent />
    </Suspense>
  );
}
