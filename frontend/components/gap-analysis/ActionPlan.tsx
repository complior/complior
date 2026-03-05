'use client';

import { useTranslations } from 'next-intl';

interface ActionItem {
  categoryId: string;
  categoryName: string;
  priority: number;
  estimatedEffort: number;
  status: 'green' | 'yellow' | 'red';
}

interface ActionPlanData {
  criticalPath: ActionItem[];
  totalEffort: number;
  suggestedDeadline: string;
}

const priorityColors: Record<string, string> = {
  red: 'border-l-red-500',
  yellow: 'border-l-amber-500',
  green: 'border-l-emerald-500',
};

export function ActionPlan({ plan }: { plan: ActionPlanData }) {
  const t = useTranslations('gapAnalysis');

  return (
    <div className="rounded-xl border border-[var(--b2)] bg-[var(--card)] p-6">
      <h2 className="text-lg font-bold text-[var(--dark)]">{t('actionPlan')}</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-[var(--bg2)] p-4">
          <p className="text-xs text-[var(--dark5)]">{t('totalEffort')}</p>
          <p className="mt-1 text-xl font-bold text-[var(--dark)]">
            {t('totalHours', { hours: String(plan.totalEffort) })}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--bg2)] p-4">
          <p className="text-xs text-[var(--dark5)]">{t('suggestedDeadline')}</p>
          <p className="mt-1 text-xl font-bold text-[var(--dark)]">{plan.suggestedDeadline}</p>
        </div>
      </div>

      <h3 className="mt-6 text-sm font-semibold text-[var(--dark3)]">{t('criticalPath')}</h3>
      <div className="mt-3 space-y-2">
        {plan.criticalPath.map((item, i) => (
          <div
            key={item.categoryId}
            className={`flex items-center justify-between rounded-lg border border-[var(--b2)] border-l-4 ${priorityColors[item.status]} bg-[var(--bg)] px-4 py-3`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg2)] text-xs font-bold text-[var(--dark4)]">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-[var(--dark)]">
                {t(`categories.${item.categoryId}`)}
              </span>
            </div>
            <span className="text-xs text-[var(--dark5)]">
              {t('hours', { hours: String(item.estimatedEffort) })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
