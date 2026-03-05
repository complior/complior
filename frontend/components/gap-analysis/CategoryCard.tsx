'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';

interface CategoryResult {
  id: string;
  name: string;
  aesiaRef: string;
  status: 'green' | 'yellow' | 'red';
  completeness: number;
  estimatedEffort: number;
  recommendations: string[];
}

const statusColors: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  yellow: 'bg-amber-100 text-amber-800 border-amber-200',
  red: 'bg-red-100 text-red-800 border-red-200',
};

const progressColors: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

export function CategoryCard({ category }: { category: CategoryResult }) {
  const t = useTranslations('gapAnalysis');

  return (
    <div className="rounded-xl border border-[var(--b2)] bg-[var(--card)] p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--dark)]">
            {t(`categories.${category.id}`)}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--dark5)]">
            {t('aesiaRef', { ref: category.aesiaRef })}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[category.status]}`}>
          {t(`status.${category.status}`)}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-[var(--dark4)]">
          <span>{t('completeness')}</span>
          <span>{category.completeness}%</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg2)]">
          <div
            className={`h-full rounded-full transition-all ${progressColors[category.status]}`}
            style={{ width: `${category.completeness}%` }}
          />
        </div>
      </div>

      {category.estimatedEffort > 0 && (
        <p className="mt-3 text-xs text-[var(--dark5)]">
          {t('estimatedEffort')}: {t('hours', { hours: String(category.estimatedEffort) })}
        </p>
      )}

      {category.recommendations.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-[var(--dark3)]">{t('recommendations')}</p>
          <ul className="mt-1 space-y-1">
            {category.recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-[var(--dark5)] pl-3 relative before:absolute before:left-0 before:top-1.5 before:h-1 before:w-1 before:rounded-full before:bg-[var(--dark5)]">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
