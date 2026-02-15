'use client';

import { Suspense } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

function SuccessContent() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('checkout');
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'polling' | 'confirmed' | 'error'>('polling');
  const [countdown, setCountdown] = useState(5);
  const retriesRef = useRef(0);

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return; }
    const poll = setInterval(async () => {
      try {
        const result = await api.billing.checkoutStatus(sessionId);
        if (result.status === 'active' || result.status === 'trialing') {
          setStatus('confirmed');
          clearInterval(poll);
        }
      } catch { /* continue */ }
      retriesRef.current += 1;
      if (retriesRef.current >= 10) { clearInterval(poll); setStatus('confirmed'); }
    }, 1500);
    return () => clearInterval(poll);
  }, [sessionId]);

  useEffect(() => {
    if (status !== 'confirmed') return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { router.push(`/${locale}/dashboard`); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, router, locale]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-[420px] text-center" style={{ animation: 'cardIn 0.5s ease forwards' }}>
        <div className="rounded-2xl border border-[var(--b2)] bg-[var(--card)] p-8 shadow-sm">
          {status === 'polling' && (
            <>
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[var(--b3)] border-t-teal" />
              <p className="text-sm text-[var(--dark5)]">{t('verifying')}</p>
            </>
          )}
          {status === 'confirmed' && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--teal-dim)]">
                <svg className="h-6 w-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h1 className="font-display text-xl font-bold text-[var(--dark)] mb-1">{t('successTitle')}</h1>
              <p className="text-sm text-[var(--dark5)] mb-4">{t('successSub')}</p>
              <Link href={`/${locale}/dashboard`}>
                <Button className="w-full">{t('goToDashboard')}</Button>
              </Link>
              <p className="mt-3 text-xs text-[var(--dark5)]">
                {t('redirecting', { seconds: countdown })}
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--coral-dim)]">
                <svg className="h-6 w-6 text-[var(--coral)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h2 className="font-display text-lg font-bold text-[var(--dark)] mb-1">{t('errorTitle')}</h2>
              <p className="text-sm text-[var(--dark5)] mb-4">{t('errorDesc')}</p>
              <Button onClick={() => window.location.reload()} className="w-full mb-2">{t('tryAgain')}</Button>
              <Link href={`/${locale}/dashboard`}>
                <Button variant="ghost" className="w-full">{t('goToDashboard')}</Button>
              </Link>
              <p className="mt-3 text-xs text-[var(--dark5)]">{t('supportEmail')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--b3)] border-t-teal" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
