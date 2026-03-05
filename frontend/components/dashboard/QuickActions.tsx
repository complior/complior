'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, FileText, Users, BookOpen, Clock } from 'lucide-react';

export function QuickActions() {
  const t = useTranslations('dashboard');
  const locale = useLocale();

  const actions = [
    { label: t('addTool'), href: `/${locale}/tools/new`, icon: Plus, enabled: true },
    { label: t('startFria'), href: `/${locale}/tools/inventory`, icon: FileText, enabled: true },
    { label: t('viewTeam'), href: `/${locale}/members`, icon: Users, enabled: true },
    { label: t('reports'), href: '#', icon: FileText, enabled: false },
    { label: t('scheduleTraining'), href: '#', icon: BookOpen, enabled: false },
    { label: t('auditTrail'), href: '#', icon: Clock, enabled: false },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 mb-5">
      {actions.map((action) => {
        const Icon = action.icon;
        if (!action.enabled) {
          return (
            <span
              key={action.label}
              className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-md border border-[var(--b2)] bg-[var(--card)] text-[0.75rem] font-semibold text-[var(--dark5)] opacity-50 cursor-not-allowed dark:border-[rgba(255,255,255,0.15)] dark:bg-[rgba(255,255,255,0.06)]"
            >
              <Icon className="w-3 h-3" />
              {action.label}
            </span>
          );
        }
        return (
          <Link
            key={action.label}
            href={action.href}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-md border border-[var(--b2)] bg-[var(--card)] text-[0.75rem] font-semibold text-[var(--dark3)] no-underline hover:border-[var(--teal)] hover:text-[var(--teal)] hover:bg-[var(--teal-dim)] transition-colors dark:border-[rgba(255,255,255,0.15)] dark:bg-[rgba(255,255,255,0.06)] dark:text-[var(--dark3)] dark:hover:border-[var(--teal)] dark:hover:text-[var(--teal)] dark:hover:bg-[rgba(132,204,22,0.08)]"
          >
            <Icon className="w-3 h-3" />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
