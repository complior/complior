'use client';

import { useTranslations } from 'next-intl';
import { LockedOverlay } from '@/components/ui/LockedOverlay';

export function ComplianceBreakdown() {
  const t = useTranslations('dashboard');

  return (
    <div className="bg-[var(--card)] border border-[var(--b2)] rounded-xl p-5 transition-all dark:border-[var(--b3)] relative overflow-hidden">
      {/* Header */}
      <div className="font-display text-[0.9375rem] font-bold text-[var(--dark)] mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 stroke-[var(--teal)]" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
        {t('complianceBreakdown')}
      </div>

      {/* Placeholder bars */}
      <div className="space-y-3">
        {['AI Literacy', 'Transparency', 'Human Oversight', 'Documentation', 'Risk Assessment'].map((label) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[var(--dark2)] w-[100px] flex-shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-[var(--bg3)] rounded-sm dark:bg-[var(--bg4)]" />
            <span className="font-mono text-[0.6875rem] font-bold w-9 text-right text-[var(--dark5)]">—</span>
          </div>
        ))}
      </div>

      <LockedOverlay
        title={t('lockedBreakdown')}
        description={t('lockedBreakdownDesc')}
        sprint={t('lockedSprint')}
      />
    </div>
  );
}
