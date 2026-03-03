'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

const SEVERITY_ICON: Record<string, { symbol: string; className: string }> = {
  critical: { symbol: '!', className: 'bg-[rgba(0,0,0,0.04)] text-[var(--coral)] dark:bg-[rgba(255,255,255,0.04)]' },
  high: { symbol: '!', className: 'bg-[rgba(0,0,0,0.04)] text-[var(--amber)] dark:bg-[rgba(255,255,255,0.04)]' },
  medium: { symbol: 'i', className: 'bg-[rgba(0,0,0,0.04)] text-[var(--dark5)] dark:bg-[rgba(255,255,255,0.04)]' },
};

interface AttentionAlertsProps {
  alerts: {
    toolId: number;
    toolName: string;
    severity: 'critical' | 'high' | 'medium';
    reason: string;
  }[];
}

export function AttentionAlerts({ alerts }: AttentionAlertsProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();

  return (
    <div className="bg-[var(--card)] border border-[var(--b2)] rounded-xl p-5 transition-all dark:border-[var(--b3)]">
      {/* Header */}
      <div className="font-display text-[0.9375rem] font-bold text-[var(--dark)] mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 stroke-[var(--teal)]" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        {t('requiresAttention')}
      </div>

      {alerts.length === 0 ? (
        <p className="text-[var(--dark4)] text-sm">{t('noAlerts')}</p>
      ) : (
        <div>
          {alerts.map((alert, i) => {
            const icon = SEVERITY_ICON[alert.severity] || SEVERITY_ICON.medium;
            const showFriaLink = alert.severity === 'critical' || alert.severity === 'high';
            return (
              <div
                key={i}
                className="flex items-center justify-between gap-2.5 py-2 px-2.5 rounded-lg mb-1 border border-transparent transition-colors hover:bg-[var(--bg2)] hover:border-[var(--b)] dark:hover:bg-[var(--bg3)] dark:hover:border-[var(--b3)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-6 h-6 rounded-md grid place-items-center flex-shrink-0 font-mono text-[0.5625rem] font-extrabold ${icon.className}`}>
                    {icon.symbol}
                  </div>
                  <div className="text-[0.8125rem] text-[var(--dark2)] leading-relaxed">
                    <strong className="font-bold text-[var(--dark)]">{alert.toolName}</strong>{' '}
                    {alert.reason}
                  </div>
                </div>
                {showFriaLink && (
                  <Link
                    href={`/${locale}/tools/${alert.toolId}?tab=documents`}
                    className="text-[var(--teal)] font-mono text-[0.6875rem] font-bold hover:underline shrink-0 no-underline"
                  >
                    {t('viewFria')}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
