'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { QuickCheckWizard } from '@/components/check/QuickCheckWizard';
import { QuickCheckResult } from '@/components/check/QuickCheckResult';
import type { QuickCheckResponse } from '@/lib/api';

export default function QuickCheckPage() {
  const t = useTranslations('quickCheck');
  const [result, setResult] = useState<QuickCheckResponse | null>(null);

  return (
    <div className="mx-auto max-w-ctr px-8 py-16">
      <div className="flex flex-col items-center">
        {!result && (
          <div className="text-center mb-10">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--teal-dim)]">
              <svg className="h-6 w-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--dark)] mb-3">
              {t('title')}
            </h1>
            <p className="text-[var(--dark4)] max-w-md mx-auto">
              {t('subtitle')}
            </p>
          </div>
        )}

        {result ? (
          <QuickCheckResult result={result} onRestart={() => setResult(null)} />
        ) : (
          <QuickCheckWizard onResult={setResult} />
        )}
      </div>
    </div>
  );
}
