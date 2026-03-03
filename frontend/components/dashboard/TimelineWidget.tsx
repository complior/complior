'use client';

import { useTranslations } from 'next-intl';

interface TimelineWidgetProps {
  timeline: {
    date: string;
    title: string;
    description: string;
    daysUntil: number;
  }[];
}

export function TimelineWidget({ timeline }: TimelineWidgetProps) {
  const t = useTranslations('dashboard');

  return (
    <div className="bg-[var(--card)] border border-[var(--b2)] rounded-xl p-5 transition-all dark:border-[var(--b3)]">
      {/* Header */}
      <div className="font-display text-[0.9375rem] font-bold text-[var(--dark)] mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 stroke-[var(--teal)]" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {t('timeline')}
      </div>

      {/* Timeline track */}
      <div className="relative pl-7">
        {/* Vertical line */}
        <div className="absolute left-2 top-2 bottom-2 w-[2px] bg-[var(--b2)] dark:bg-[var(--b3)]" />

        {timeline.map((milestone, i) => {
          const isPast = milestone.daysUntil <= 0;
          const isCurrent = !isPast && (i === 0 || timeline[i - 1]?.daysUntil <= 0);

          return (
            <div key={i} className={`relative ${i < timeline.length - 1 ? 'pb-5' : ''}`}>
              {/* Dot */}
              <div
                className={`absolute -left-7 top-1 w-3 h-3 rounded-full border-2
                  ${isCurrent
                    ? 'bg-[var(--teal)] border-[var(--teal)] shadow-[0_0_0_4px_var(--teal-dim)]'
                    : isPast
                      ? 'bg-[var(--teal-dim)] border-[var(--teal)]'
                      : 'bg-[var(--bg)] border-[var(--b3)]'
                  }`}
              />

              {/* Date */}
              <div className="font-mono text-[0.4375rem] text-[var(--dark5)] uppercase tracking-[0.04em] mb-0.5 dark:text-[var(--dark4)]">
                {milestone.date}
              </div>

              {/* Text */}
              <div className={`text-[0.8125rem] font-medium ${isPast ? 'text-[var(--dark5)]' : 'text-[var(--dark2)]'}`}>
                {milestone.title}
                {isPast && ' \u2713'}
              </div>

              {/* Countdown for current */}
              {isCurrent && milestone.daysUntil > 0 && (
                <div className="font-mono text-[0.5rem] font-bold text-[var(--teal)] mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {t('daysUntil', { days: String(milestone.daysUntil) })} remaining
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
