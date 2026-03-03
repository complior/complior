'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { LockedOverlay } from '@/components/ui/LockedOverlay';
import { api, type FRIAByToolResponse } from '@/lib/api';

interface HighRiskTool {
  toolId: number;
  toolName: string;
}

interface DocumentStatusProps {
  highRiskTools?: HighRiskTool[];
}

export function DocumentStatus({ highRiskTools = [] }: DocumentStatusProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [friaData, setFriaData] = useState<FRIAByToolResponse | null>(null);

  const firstTool = highRiskTools[0] ?? null;

  useEffect(() => {
    if (!firstTool) return;
    api.fria.getByTool(firstTool.toolId)
      .then(setFriaData)
      .catch(() => {});
  }, [firstTool]);

  const getFriaStatus = () => {
    if (!firstTool) return { label: t('friaNotStarted'), color: 'text-[var(--dark5)]' };
    if (!friaData || !friaData.assessment) return { label: t('friaNotStarted'), color: 'text-[var(--dark5)]' };

    const { assessment, sections } = friaData;
    if (assessment.status === 'completed') return { label: t('friaCompleted'), color: 'text-[var(--teal)]' };

    const completed = sections.filter((s) => s.completed).length;
    const total = sections.length || 6;
    return {
      label: t('friaInProgress', { completed: String(completed), total: String(total) }),
      color: 'text-[var(--amber)]',
    };
  };

  const friaStatus = getFriaStatus();
  const lockedDocs = ['AI Usage Policy', 'Oversight Procedures', 'EU Registrations'];

  return (
    <div className="bg-[var(--card)] border border-[var(--b2)] rounded-xl p-5 transition-all dark:border-[var(--b3)] relative overflow-hidden">
      {/* Header */}
      <div className="font-display text-[0.9375rem] font-bold text-[var(--dark)] mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 stroke-[var(--teal)]" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        {t('documentStatus')}
      </div>

      <div className="flex flex-col gap-2">
        {/* FRIA row — live, not locked */}
        <div className="flex items-center justify-between py-2 px-2.5 border border-[var(--b)] rounded-lg">
          <div className="flex flex-col gap-0.5">
            <span className="text-[0.8125rem] font-semibold text-[var(--dark)]">FRIA</span>
            <span className={`font-mono text-[0.6875rem] font-semibold ${friaStatus.color}`}>
              {friaStatus.label}
            </span>
          </div>
          {firstTool ? (
            <Link
              href={`/${locale}/tools/${firstTool.toolId}?tab=documents`}
              className="font-mono text-[0.6875rem] font-bold text-[var(--teal)] hover:underline no-underline"
            >
              View →
            </Link>
          ) : (
            <span className="font-mono text-[0.6875rem] font-bold text-[var(--dark5)]">—</span>
          )}
        </div>

        {/* Locked rows */}
        <div className="relative overflow-hidden rounded-lg">
          {lockedDocs.map((name) => (
            <div key={name} className="flex items-center justify-between py-2 px-2.5 border border-[var(--b)] rounded-lg mb-2 last:mb-0">
              <div className="flex flex-col gap-0.5">
                <span className="text-[0.8125rem] font-semibold text-[var(--dark)]">{name}</span>
                <span className="font-mono text-[0.4375rem] font-semibold text-[var(--dark5)]">—</span>
              </div>
              <span className="font-mono text-[0.4375rem] font-bold text-[var(--teal)]">View →</span>
            </div>
          ))}
          <LockedOverlay
            title={t('lockedDocStatus')}
            description={t('lockedDocStatusDesc')}
            sprint={t('lockedSprint')}
          />
        </div>
      </div>
    </div>
  );
}
