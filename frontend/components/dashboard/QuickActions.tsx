'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, ListChecks, Users, FileText, BookOpen, Clock } from 'lucide-react';

export function QuickActions() {
  const t = useTranslations('dashboard');
  const locale = useLocale();

  const actions = [
    { label: t('addTool'), href: `/${locale}/tools/new`, icon: Plus, enabled: true },
    { label: t('viewInventory'), href: `/${locale}/tools/inventory`, icon: ListChecks, enabled: true },
    { label: t('viewTeam'), href: `/${locale}/members`, icon: Users, enabled: true },
    { label: t('generateReport'), href: '#', icon: FileText, enabled: false },
    { label: t('askEva'), href: '#', icon: BookOpen, enabled: false },
    { label: 'Audit Trail', href: '#', icon: Clock, enabled: false },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 mb-5">
      {actions.map((action) => {
        const Icon = action.icon;
        if (!action.enabled) {
          return (
            <span
              key={action.label}
              className="inline-flex items-center gap-1 px-3 py-[7px] rounded-md border border-[var(--b2)] bg-[var(--card)] text-[0.75rem] font-semibold text-[var(--dark5)] opacity-50 cursor-not-allowed"
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
            className="inline-flex items-center gap-1 px-3 py-[7px] rounded-md border border-[var(--b2)] bg-[var(--card)] text-[0.75rem] font-semibold text-[var(--dark3)] no-underline hover:border-[var(--teal)] hover:text-[var(--teal)] hover:bg-[var(--teal-dim)] transition-all"
          >
            <Icon className="w-3 h-3" />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
