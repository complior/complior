'use client';

import { useTranslations } from 'next-intl';

interface RecentActivityWidgetProps {
  activity: {
    auditLogId: number;
    userId: number;
    action: string;
    entity: string;
    entityId: number | null;
    details: string | null;
    email: string;
    fullName: string;
    createdAt: string;
  }[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export function RecentActivityWidget({ activity }: RecentActivityWidgetProps) {
  const t = useTranslations('dashboard');

  return (
    <div className="bg-[var(--card)] border border-[var(--b2)] rounded-xl p-5 transition-all dark:border-[var(--b3)]">
      {/* Header */}
      <div className="font-display text-[0.9375rem] font-bold text-[var(--dark)] mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 stroke-[var(--teal)]" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        {t('recentActivity')}
        <span className="font-mono text-[0.4375rem] bg-[var(--bg3)] text-[var(--dark4)] py-0.5 px-1.5 rounded ml-auto dark:bg-[var(--bg4)]">
          Last 7 days
        </span>
      </div>

      {activity.length === 0 ? (
        <p className="text-[var(--dark4)] text-sm">{t('noActivity')}</p>
      ) : (
        <div>
          {activity.map((entry) => (
            <div
              key={entry.auditLogId}
              className="flex items-start gap-2 py-[0.4375rem] border-b border-[var(--b)] last:border-none"
            >
              {/* Dot */}
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--b3)] mt-2 flex-shrink-0" />

              {/* Text */}
              <div className="text-[0.8125rem] text-[var(--dark2)] flex-1">
                <strong className="font-bold text-[var(--dark)]">{entry.fullName || entry.email}</strong>{' '}
                {entry.action} {entry.entity}
                {entry.details && <> — {entry.details}</>}
              </div>

              {/* Time */}
              <div className="font-mono text-[0.4375rem] text-[var(--dark5)] whitespace-nowrap mt-0.5">
                {timeAgo(entry.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
