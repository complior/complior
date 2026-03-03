'use client';

import { useTranslations } from 'next-intl';

export function AuditTrailTab() {
  const t = useTranslations('toolDetail');

  return (
    <div className="text-center py-12 px-8">
      <svg className="mx-auto mb-3 opacity-40" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--dark5)" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <h3 className="font-display text-base font-bold text-[var(--dark4)] mb-1">{t('tabAuditTrail')}</h3>
      <p className="text-[0.8125rem] text-[var(--dark5)]">{t('auditTrailPlaceholder')}</p>
      <span className="inline-block mt-3 font-mono text-[0.4375rem] px-2 py-0.5 rounded bg-[var(--bg3)] text-[var(--dark5)]">
        {t('lockedSprint')}
      </span>
    </div>
  );
}
