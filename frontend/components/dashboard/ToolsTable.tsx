'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { RiskBadge } from '@/components/tools/RiskBadge';
import { api, type AITool } from '@/lib/api';

const RISK_FILTERS = ['all', 'prohibited', 'high', 'limited', 'minimal'] as const;

export function ToolsTable() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [tools, setTools] = useState<AITool[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    api.tools.list({ page: '1', pageSize: '20' })
      .then((res) => setTools(res.data))
      .catch(() => {});
  }, []);

  const filtered = filter === 'all'
    ? tools
    : tools.filter((tool) => tool.riskLevel === filter);

  const riskCounts = tools.reduce<Record<string, number>>((acc, tool) => {
    if (tool.riskLevel) acc[tool.riskLevel] = (acc[tool.riskLevel] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-[var(--card)] border border-[var(--b2)] rounded-xl p-5 transition-all dark:border-[var(--b3)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="font-display text-[0.9375rem] font-bold text-[var(--dark)] flex items-center gap-2">
          <svg className="w-4 h-4 stroke-[var(--teal)]" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          {t('toolsTable')}
          <span className="font-mono text-[0.4375rem] bg-[var(--bg3)] text-[var(--dark4)] py-0.5 px-1.5 rounded ml-1 dark:bg-[var(--bg4)]">
            {tools.length}
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1">
          {RISK_FILTERS.map((f) => {
            const count = f === 'all' ? tools.length : (riskCounts[f] || 0);
            if (f !== 'all' && count === 0) return null;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`font-mono text-[0.4375rem] py-1 px-2 rounded-[5px] border font-semibold transition-colors cursor-pointer
                  ${filter === f
                    ? 'border-[var(--teal)] text-[var(--teal)] bg-[var(--teal-dim)]'
                    : 'border-[var(--b2)] text-[var(--dark4)] bg-transparent hover:border-[var(--teal)] hover:text-[var(--teal)] hover:bg-[var(--teal-dim)] dark:border-[var(--b3)]'
                  }`}
              >
                {f === 'all' ? `All ${count}` : count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {tools.length === 0 ? (
        <p className="text-[var(--dark5)] text-sm">{t('noClassifiedTools')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="font-mono text-[0.375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark5)] text-left py-2 px-2.5 border-b border-[var(--b2)] dark:text-[var(--dark4)]">{t('name')}</th>
                <th className="font-mono text-[0.375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark5)] text-left py-2 px-2.5 border-b border-[var(--b2)] dark:text-[var(--dark4)]">{t('risk')}</th>
                <th className="font-mono text-[0.375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark5)] text-left py-2 px-2.5 border-b border-[var(--b2)] dark:text-[var(--dark4)]">{t('status')}</th>
                <th className="font-mono text-[0.375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark5)] text-left py-2 px-2.5 border-b border-[var(--b2)] dark:text-[var(--dark4)]">{t('score')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tool) => (
                <tr key={tool.id} className="transition-colors cursor-pointer hover:bg-[var(--teal-dim)]">
                  <td className="py-2 px-2.5 border-b border-[var(--b)]">
                    <Link href={`/${locale}/tools/${tool.id}`} className="no-underline">
                      <div className="text-[0.8125rem] font-semibold text-[var(--dark)]">{tool.name}</div>
                      <div className="text-[0.625rem] text-[var(--dark5)]">{tool.vendorName}</div>
                    </Link>
                  </td>
                  <td className="py-2 px-2.5 border-b border-[var(--b)]">
                    <RiskBadge riskLevel={tool.riskLevel} />
                  </td>
                  <td className="py-2 px-2.5 border-b border-[var(--b)]">
                    <StatusIndicator status={tool.complianceStatus} />
                  </td>
                  <td className="py-2 px-2.5 border-b border-[var(--b)] font-mono text-[0.6875rem] text-[var(--dark4)]">
                    {tool.complianceScore > 0 ? `${tool.complianceScore}%` : '\u2014'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-[var(--b)] flex justify-end">
        <Link href={`/${locale}/tools/inventory`} className="font-mono text-[0.4375rem] font-bold text-[var(--teal)] no-underline hover:underline">
          {t('viewAll')} →
        </Link>
      </div>
    </div>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const iconMap: Record<string, { svg: React.ReactNode; cls: string; label: string }> = {
    compliant: {
      svg: <polyline points="20 6 9 17 4 12" />,
      cls: 'stroke-[var(--teal)]',
      label: 'Compliant',
    },
    in_progress: {
      svg: <path d="M21 12a9 9 0 1 1-6.22-8.56" />,
      cls: 'stroke-[var(--amber)]',
      label: 'In progress',
    },
    review: {
      svg: <path d="M21 12a9 9 0 1 1-6.22-8.56" />,
      cls: 'stroke-[var(--amber)]',
      label: 'Review',
    },
    not_started: {
      svg: <circle cx="12" cy="12" r="10" />,
      cls: 'stroke-[var(--dark5)]',
      label: 'Pending',
    },
    non_compliant: {
      svg: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
      cls: 'stroke-[var(--coral)]',
      label: 'Non-compliant',
    },
  };

  const info = iconMap[status] || iconMap.not_started;

  return (
    <div className="flex items-center gap-1 text-xs">
      <svg className={`w-3 h-3 ${info.cls}`} viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {info.svg}
      </svg>
      <span className="text-[var(--dark3)]">{info.label}</span>
    </div>
  );
}
