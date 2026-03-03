'use client';

import { useTranslations } from 'next-intl';
import { LockedOverlay } from '@/components/ui/LockedOverlay';

export function LiteracyWidget() {
  const t = useTranslations('dashboard');

  return (
    <div className="bg-[var(--card)] border border-[var(--b2)] rounded-xl p-5 transition-all dark:border-[var(--b3)] relative overflow-hidden min-h-[180px]">
      {/* Header */}
      <div className="font-display text-[0.9375rem] font-bold text-[var(--dark)] mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 stroke-[var(--teal)]" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        {t('aiLiteracy')}
      </div>

      {/* Placeholder */}
      <div className="h-24" />

      <LockedOverlay
        title={t('lockedLiteracy')}
        description={t('lockedLiteracyDesc')}
        sprint={t('lockedSprint')}
      />
    </div>
  );
}
