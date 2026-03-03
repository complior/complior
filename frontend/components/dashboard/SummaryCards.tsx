'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { DashboardSummary } from '@/lib/api';

interface SummaryCardsProps {
  data: DashboardSummary;
}

export function SummaryCards({ data }: SummaryCardsProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();

  const scorePercent = data.complianceScore.overall ?? 0;
  const literacyPercent = data.aiLiteracy.completionRate ?? 0;
  const highRiskCount = data.riskDistribution.high + data.riskDistribution.prohibited;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      {/* AI Tools */}
      <div className="bg-[var(--card)] border border-[var(--b2)] rounded-[10px] p-3.5 transition-all hover:border-[var(--b3)] hover:shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between font-mono text-[0.375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark5)] mb-1.5">
          {t('totalTools')}
          <Link href={`/${locale}/tools/new`} className="text-[var(--teal)] no-underline text-[0.375rem]">+ Add</Link>
        </div>
        <div className="font-display text-[1.375rem] font-extrabold text-[var(--dark)] leading-none">{data.tools.total}</div>
        <div className="text-[0.625rem] text-[var(--dark5)] mt-0.5">total registered</div>
      </div>

      {/* Classified */}
      <div className="bg-[var(--card)] border border-[var(--b2)] rounded-[10px] p-3.5 transition-all hover:border-[var(--b3)] hover:shadow-sm">
        <div className="font-mono text-[0.375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark5)] mb-1.5">
          {t('classified')}
        </div>
        <div className="font-display text-[1.375rem] font-extrabold text-[var(--dark)] leading-none">
          {data.tools.classified} / {data.tools.total}
        </div>
        <div className="text-[0.625rem] text-[var(--dark5)] mt-0.5">{data.tools.unclassified} pending</div>
      </div>

      {/* Compliance Score */}
      <div className="bg-[var(--card)] border border-[var(--b2)] rounded-[10px] p-3.5 transition-all hover:border-[var(--b3)] hover:shadow-sm">
        <div className="font-mono text-[0.375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark5)] mb-1.5">
          {t('complianceScore')}
        </div>
        <div className="font-display text-[1.375rem] font-extrabold text-[var(--dark)] leading-none">{scorePercent}%</div>
        <div className="text-[0.625rem] text-[var(--dark5)] mt-0.5">
          {scorePercent >= 80 ? 'on track' : scorePercent >= 50 ? 'needs improvement' : 'critical'}
        </div>
      </div>

      {/* AI Literacy */}
      <div className="bg-[var(--card)] border border-[var(--b2)] rounded-[10px] p-3.5 transition-all hover:border-[var(--b3)] hover:shadow-sm">
        <div className="font-mono text-[0.375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark5)] mb-1.5">
          {t('aiLiteracy')}
        </div>
        <div className="font-display text-[1.375rem] font-extrabold text-[var(--dark)] leading-none">
          {literacyPercent > 0 ? `${literacyPercent}%` : '\u2014'}
        </div>
        <div className="text-[0.625rem] text-[var(--dark5)] mt-0.5">{data.aiLiteracy.message || ''}</div>
        {literacyPercent > 0 && (
          <div className="h-1 bg-[var(--bg3)] rounded-sm mt-2 overflow-hidden">
            <div className="h-full rounded-sm bg-[var(--teal)] transition-all duration-500" style={{ width: `${literacyPercent}%` }} />
          </div>
        )}
      </div>

      {/* Penalty Exposure */}
      <div className="bg-[var(--card)] border border-[var(--b2)] rounded-[10px] p-3.5 transition-all hover:border-[var(--b3)] hover:shadow-sm">
        <div className="font-mono text-[0.375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark5)] mb-1.5">
          {t('penaltyExposure')}
        </div>
        <div className="font-display text-[1.375rem] font-extrabold text-[var(--dark)] leading-none">
          {highRiskCount > 0 ? `\u20AC${highRiskCount > 0 && data.riskDistribution.prohibited > 0 ? '35M' : '15M'}` : '\u20AC0'}
        </div>
        <div className="text-[0.625rem] text-[var(--dark5)] mt-0.5">{highRiskCount} high-risk tools</div>
      </div>
    </div>
  );
}
