'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

function CancelContent() {
  const locale = useLocale();
  const t = useTranslations('checkout');
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || '';
  const period = searchParams.get('period') || 'monthly';

  const retryUrl = plan
    ? `/${locale}/auth/register?plan=${plan}&period=${period}`
    : `/${locale}/pricing`;

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-[420px] text-center" style={{ animation: 'cardIn 0.5s ease forwards' }}>
        <div className="rounded-2xl border border-[var(--b2)] bg-[var(--card)] p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg3)]">
            <svg className="h-6 w-6 text-[var(--dark5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-bold text-[var(--dark)] mb-2">{t('cancelTitle')}</h1>
          <p className="text-sm text-[var(--dark5)] mb-6">{t('cancelDesc')}</p>
          <div className="flex flex-col gap-2">
            <Link href={retryUrl}>
              <Button className="w-full">Try Again</Button>
            </Link>
            <Link href={`/${locale}/pricing`}>
              <Button variant="ghost" className="w-full">{t('returnToPricing')}</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center"><p className="text-[var(--dark5)]">Loading...</p></div>}>
      <CancelContent />
    </Suspense>
  );
}
