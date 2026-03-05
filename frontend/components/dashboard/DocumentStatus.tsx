'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { api, type DocumentListItem, type FRIAByToolResponse } from '@/lib/api';

interface HighRiskTool {
  toolId: number;
  toolName: string;
}

interface DocumentStatusProps {
  highRiskTools?: HighRiskTool[];
  cliScores?: Record<string, { score: number | null; lastSync: string | null }>;
}

const DOC_STATUS_COLORS: Record<string, string> = {
  draft: 'text-[var(--dark5)]',
  generating: 'text-[#3498db]',
  review: 'text-[#f1c40f]',
  approved: 'text-[var(--teal)]',
  archived: 'text-[var(--dark5)]',
};

export function DocumentStatus({ highRiskTools = [], cliScores = {} }: DocumentStatusProps) {
  const t = useTranslations('dashboard');
  const tDoc = useTranslations('documents');
  const locale = useLocale();
  const [friaData, setFriaData] = useState<FRIAByToolResponse | null>(null);
  const [docs, setDocs] = useState<DocumentListItem[]>([]);

  const firstTool = highRiskTools[0] ?? null;

  useEffect(() => {
    if (!firstTool) return;
    api.fria.getByTool(firstTool.toolId)
      .then(setFriaData)
      .catch((err) => { console.error('Failed to load FRIA data:', err); });
  }, [firstTool]);

  useEffect(() => {
    api.documents.list({ pageSize: '3' })
      .then((res) => setDocs(res.data))
      .catch((err) => { console.error('Failed to load documents:', err); });
  }, []);

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
              {t('viewDoc')} &rarr;
            </Link>
          ) : (
            <span className="font-mono text-[0.6875rem] font-bold text-[var(--dark5)]">&mdash;</span>
          )}
        </div>

        {/* Real document rows */}
        {docs.length > 0 ? (
          docs.map((doc) => (
            <div key={doc.complianceDocumentId} className="flex items-center justify-between py-2 px-2.5 border border-[var(--b)] rounded-lg">
              <div className="flex flex-col gap-0.5">
                <span className="text-[0.8125rem] font-semibold text-[var(--dark)]">{doc.title}</span>
                <span className={`font-mono text-[0.6875rem] font-semibold ${DOC_STATUS_COLORS[doc.status] || DOC_STATUS_COLORS.draft}`}>
                  {tDoc('progress', { completed: String(doc.completedSections), total: String(doc.totalSections) })}
                </span>
              </div>
              <Link
                href={`/${locale}/documents/${doc.complianceDocumentId}`}
                className="font-mono text-[0.6875rem] font-bold text-[var(--teal)] hover:underline no-underline"
              >
                {t('viewDoc')} &rarr;
              </Link>
            </div>
          ))
        ) : (
          <div className="py-3 px-2.5 text-center">
            <span className="text-[0.8125rem] text-[var(--dark5)]">{t('noDocumentsYet')}</span>
          </div>
        )}
      </div>

      {/* CLI Scanner Scores */}
      {Object.keys(cliScores).length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--b)]">
          <div className="text-[0.75rem] font-semibold text-[var(--dark5)] uppercase tracking-wider mb-2">
            {t('cliScore')}
          </div>
          {Object.entries(cliScores).map(([slug, data]) => (
            <div key={slug} className="flex items-center justify-between py-1.5 px-2.5">
              <span className="text-[0.8125rem] text-[var(--dark)]">{slug}</span>
              <div className="flex items-center gap-2">
                {data.score !== null && (
                  <span className={`font-mono text-[0.75rem] font-bold ${
                    data.score >= 70 ? 'text-[var(--teal)]' : data.score >= 40 ? 'text-[var(--amber)]' : 'text-[var(--red)]'
                  }`}>
                    {data.score}/100
                  </span>
                )}
                {data.lastSync && (
                  <span className="text-[0.6875rem] text-[var(--dark5)]">
                    {new Date(data.lastSync).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
