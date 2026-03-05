'use client';

import { useTranslations } from 'next-intl';

interface WelcomeBarProps {
  userName: string;
}

export function WelcomeBar({ userName }: WelcomeBarProps) {
  const t = useTranslations('dashboard');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
      <h1 className="font-display text-[1.25rem] font-bold text-[var(--dark)] tracking-tight">
        {t('welcome', { name: userName.split(' ')[0] || userName })}
      </h1>
      <div className="flex gap-1.5 items-center">
        <span className="font-mono text-[0.4375rem] text-[var(--dark5)] uppercase tracking-[0.04em] mr-2">{dateStr}</span>
        <button
          className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-[7px] bg-[var(--bg2)] text-[var(--dark3)] border border-[var(--b2)] font-bold text-[0.75rem] transition-all hover:border-[var(--b3)] hover:text-[var(--dark)] dark:bg-[var(--bg3)] dark:border-[var(--b3)] cursor-not-allowed opacity-60"
          disabled
        >
          <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="12" y2="12" />
            <line x1="15" y1="15" x2="12" y2="12" />
          </svg>
          {t('generateReport')}
        </button>
        <button
          className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-[7px] bg-[var(--bg2)] text-[var(--dark3)] border border-[var(--b2)] font-bold text-[0.75rem] transition-all hover:border-[var(--b3)] hover:text-[var(--dark)] dark:bg-[var(--bg3)] dark:border-[var(--b3)] cursor-not-allowed opacity-60"
          disabled
        >
          <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {t('exportPdf')}
        </button>
      </div>
    </div>
  );
}
