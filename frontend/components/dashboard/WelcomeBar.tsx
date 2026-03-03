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
    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <h1 className="font-display text-xl font-bold text-[var(--dark)] tracking-tight">
        {t('welcome', { name: userName.split(' ')[0] || userName })}
      </h1>
      <div className="flex gap-1.5 items-center">
        <span className="font-mono text-[0.4375rem] text-[var(--dark5)] uppercase tracking-[0.04em] mr-2">{dateStr}</span>
      </div>
    </div>
  );
}
