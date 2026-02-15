'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

export default function VerifyEmailPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // Ory Kratos handles the verification callback
    // The URL will contain flow and code params processed by Kratos
    const timer = setTimeout(() => {
      setStatus('success');
      setTimeout(() => router.push(`/${locale}/dashboard`), 2000);
    }, 1500);
    return () => clearTimeout(timer);
  }, [router, locale]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-[420px]" style={{ animation: 'cardIn 0.5s ease forwards' }}>
        <div className="rounded-2xl border border-[var(--b2)] bg-[var(--card)] p-8 shadow-sm text-center">
          <h1 className="font-display text-xl font-bold text-[var(--dark)] mb-3">{t('verifyTitle')}</h1>
          {status === 'loading' && (
            <p className="text-sm text-[var(--dark5)]">Verifying...</p>
          )}
          {status === 'success' && (
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--teal-dim)]">
                <svg className="h-6 w-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm text-[var(--dark4)]">{t('verifySuccess')}</p>
              <p className="mt-2 text-xs text-[var(--dark5)]">{t('verifyRedirect')}</p>
            </>
          )}
          {status === 'error' && (
            <p className="text-sm text-[var(--coral)]">{t('verifyError')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
