'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { RiskBadge } from './RiskBadge';
import type { AIToolDetail } from '@/lib/api';

interface ToolDetailHeaderProps {
  tool: AIToolDetail;
  onDelete: () => void;
  onReclassify?: () => void;
  onOpenFria?: () => void;
  deleting: boolean;
  reclassifying?: boolean;
}

const DOMAIN_LABELS: Record<string, string> = {
  hr_recruitment: 'HR & Recruitment',
  healthcare: 'Healthcare',
  finance: 'Finance & Insurance',
  education: 'Education',
  law_enforcement: 'Law Enforcement',
  critical_infrastructure: 'Critical Infrastructure',
  government: 'Government',
  marketing: 'Marketing & Sales',
  customer_service: 'Customer Service',
  content_creation: 'Content Creation',
  software_development: 'Software Development',
  other: 'Other',
};

export function ToolDetailHeader({ tool, onDelete, onReclassify, onOpenFria, deleting, reclassifying }: ToolDetailHeaderProps) {
  const t = useTranslations('toolDetail');
  const locale = useLocale();

  const completed = tool.requirements?.filter((r) => r.status === 'completed').length ?? 0;
  const total = tool.requirements?.length ?? 0;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-1.5 font-mono text-[0.4375rem] font-bold uppercase tracking-[0.04em] text-[var(--dark5)]">
        <Link href={`/${locale}/dashboard`} className="text-[var(--dark4)] hover:text-[var(--teal)]">
          {t('breadcrumbDashboard')}
        </Link>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <Link href={`/${locale}/tools/inventory`} className="text-[var(--dark4)] hover:text-[var(--teal)]">
          {t('breadcrumbTools')}
        </Link>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>{tool.name}</span>
      </div>

      {/* Tool Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-[var(--bg2)] border border-[var(--b2)] grid place-items-center font-display text-xl font-extrabold text-[var(--dark4)] shrink-0">
            {tool.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-display text-xl font-bold text-[var(--dark)] mb-0.5">{tool.name}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[0.8125rem] text-[var(--dark5)]">
                {tool.vendorName}{tool.vendorCountry ? ` (${tool.vendorCountry})` : ''}
              </span>
              <RiskBadge riskLevel={tool.riskLevel} />
              {tool.domain && (
                <span className="font-mono text-[0.4375rem] font-bold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded bg-[var(--bg3)] text-[var(--dark4)]">
                  {DOMAIN_LABELS[tool.domain] || tool.domain}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {onReclassify && (
            <button
              onClick={onReclassify}
              disabled={reclassifying}
              className="px-3.5 py-2 rounded-lg font-body text-xs font-bold bg-[var(--bg2)] text-[var(--dark3)] border border-[var(--b2)] hover:border-[var(--b3)] hover:text-[var(--dark)] transition-all inline-flex items-center gap-1.5"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              {reclassifying ? '...' : t('reclassify')}
            </button>
          )}
          {onOpenFria && (
            <button
              onClick={onOpenFria}
              className="px-3.5 py-2 rounded-lg font-body text-xs font-bold bg-[var(--teal)] text-white hover:opacity-90 transition-all inline-flex items-center gap-1.5"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {t('completeFria')}
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={deleting}
            className="px-3.5 py-2 rounded-lg font-body text-xs font-bold text-[var(--coral)] border border-transparent hover:bg-[rgba(231,76,60,0.06)] hover:border-[rgba(231,76,60,0.15)] transition-all inline-flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {deleting ? t('deleting') : t('delete')}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6 max-sm:grid-cols-1">
        {/* Risk Level */}
        <div className="bg-[var(--card)] border border-[var(--b2)] rounded-[10px] p-4 transition-colors">
          <div className="font-mono text-[0.375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark5)] mb-1.5">
            {t('riskLevel')}
          </div>
          <div className="font-display text-xl font-extrabold text-[var(--amber)] flex items-center gap-1.5">
            {tool.riskLevel ? (
              <RiskBadge riskLevel={tool.riskLevel} className="text-[0.5rem] px-2 py-0.5" />
            ) : (
              <span className="text-[var(--dark5)]">—</span>
            )}
          </div>
          {tool.annexCategory && (
            <div className="text-[0.6875rem] text-[var(--dark5)] mt-0.5">{tool.annexCategory}</div>
          )}
        </div>

        {/* Compliance Status */}
        <div className="bg-[var(--card)] border border-[var(--b2)] rounded-[10px] p-4 transition-colors">
          <div className="font-mono text-[0.375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark5)] mb-1.5">
            {t('complianceStatus')}
          </div>
          <div className="font-display text-xl font-extrabold text-[var(--coral)]">
            {total > 0 ? `${completed} / ${total}` : '—'}
          </div>
          {total > 0 && (
            <div className="text-[0.6875rem] text-[var(--dark5)] mt-0.5">{t('requirementsCompleted')}</div>
          )}
        </div>

        {/* Confidence */}
        <div className="bg-[var(--card)] border border-[var(--b2)] rounded-[10px] p-4 transition-colors">
          <div className="font-mono text-[0.375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark5)] mb-1.5">
            {t('confidence')}
          </div>
          <div className="font-display text-xl font-extrabold text-[var(--dark)]">
            {tool.classificationConfidence ? `${tool.classificationConfidence}%` : '—'}
          </div>
          {tool.classification?.method && (
            <div className="text-[0.6875rem] text-[var(--dark5)] mt-0.5">{tool.classification.method}</div>
          )}
        </div>
      </div>
    </div>
  );
}
