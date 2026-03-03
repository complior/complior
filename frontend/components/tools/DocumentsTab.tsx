'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { api, type FRIAAssessment, type FRIASection } from '@/lib/api';

interface DocumentsTabProps {
  toolId: number;
  riskLevel: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[var(--bg3)] text-[var(--dark5)]',
  in_progress: 'bg-[rgba(52,152,219,0.1)] text-[#3498db]',
  review: 'bg-[rgba(241,196,15,0.1)] text-[#f1c40f]',
  completed: 'bg-[rgba(46,204,113,0.1)] text-[#2ecc71]',
};

export function DocumentsTab({ toolId, riskLevel }: DocumentsTabProps) {
  const t = useTranslations('fria');
  const router = useRouter();
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [assessment, setAssessment] = useState<FRIAAssessment | null>(null);
  const [sections, setSections] = useState<FRIASection[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isHighRisk = riskLevel === 'high' || riskLevel === 'prohibited';

  const fetchFRIA = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.fria.getByTool(toolId);
      setAssessment(data.assessment);
      setSections(data.sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [toolId]);

  useEffect(() => {
    fetchFRIA();
  }, [fetchFRIA]);

  const handleStart = async () => {
    setCreating(true);
    setError(null);
    try {
      const result = await api.fria.create(toolId);
      const friaId = result.fRIAAssessmentId;
      router.push(`/${locale}/tools/${toolId}/fria/${friaId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-xl bg-[var(--bg2)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--coral)] bg-[rgba(231,76,60,0.06)] p-4">
        <p className="text-sm text-[var(--coral)]">{error}</p>
      </div>
    );
  }

  // Not required for minimal/limited risk
  if (!isHighRisk && !assessment) {
    return (
      <div className="text-center py-12 px-8">
        <svg className="mx-auto mb-3 opacity-40" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--dark5)" strokeWidth="1.5">
          <path d="M9 12l2 2 4-4" />
          <circle cx="12" cy="12" r="10" />
        </svg>
        <h3 className="font-display text-base font-bold text-[var(--dark4)] mb-1">{t('title')}</h3>
        <p className="text-[0.8125rem] text-[var(--dark5)]">{t('notRequired')}</p>
      </div>
    );
  }

  // No FRIA yet — show onboarding card
  if (!assessment) {
    return (
      <div className="rounded-xl border border-[var(--b)] p-6 bg-[var(--bg)]">
        {/* Header with icon */}
        <div className="flex items-start gap-4 mb-5">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--teal-dim)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-[var(--dark3)] mb-1">{t('title')}</h3>
            <p className="text-[0.8125rem] text-[var(--dark4)] leading-relaxed">
              {t('onboarding.whatIsFria')}
            </p>
          </div>
        </div>

        {/* Legal basis callout */}
        <div className="flex gap-3 p-4 rounded-lg border border-[var(--teal)] bg-[var(--teal-dim)] mb-4">
          <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <span className="block text-[0.6875rem] font-mono uppercase tracking-wide text-[var(--teal)] mb-1">
              {t('onboarding.legalBasisLabel')}
            </span>
            <p className="text-[0.8125rem] text-[var(--dark3)] leading-relaxed">
              {t('onboarding.whyRequired')}
            </p>
          </div>
        </div>

        {/* What completing achieves */}
        <p className="text-[0.8125rem] text-[var(--dark4)] leading-relaxed mb-4">
          {t('onboarding.whatHappens')}
        </p>

        {/* Urgency indicator for high-risk */}
        {isHighRisk && (
          <div className="flex gap-3 p-3 rounded-lg border border-[var(--coral)] bg-[rgba(231,76,60,0.06)] mb-5">
            <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-[0.8125rem] text-[var(--coral)] font-medium">
              {t('onboarding.urgencyHigh')}
            </p>
          </div>
        )}

        {/* Footer: time + start button */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--b)]">
          <span className="text-[0.6875rem] font-mono text-[var(--dark5)]">
            {t('onboarding.estimatedTime')}
          </span>
          <button
            onClick={handleStart}
            disabled={creating}
            className="px-5 py-2.5 rounded-lg bg-[var(--teal)] text-white text-[0.8125rem] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_12px_var(--teal-glow)]"
          >
            {creating ? t('saving') : t('startButton')}
          </button>
        </div>
      </div>
    );
  }

  // FRIA exists — show status card
  const completedCount = sections.filter((s) => s.completed).length;
  const totalCount = sections.length;

  return (
    <div className="space-y-4">
      {/* FRIA status card */}
      <div className="rounded-xl border border-[var(--b)] p-5 bg-[var(--bg)]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-base font-bold text-[var(--dark3)]">{t('title')}</h3>
            <p className="text-[0.75rem] text-[var(--dark5)] mt-0.5">{t('subtitle')}</p>
          </div>
          <span className={`text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[assessment.status] || STATUS_COLORS.draft}`}>
            {t(`status.${assessment.status}`)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[0.75rem] text-[var(--dark5)]">
              {t('progress', { completed: completedCount, total: totalCount })}
            </span>
            <span className="text-[0.75rem] font-mono text-[var(--dark4)]">
              {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="h-1.5 bg-[var(--bg3)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--teal)] rounded-full transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Section checklist */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {sections.map((section) => (
            <div key={section.sectionType} className="flex items-center gap-2 text-[0.75rem]">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[0.5rem] ${
                section.completed
                  ? 'bg-[var(--teal-dim)] text-[var(--teal)]'
                  : 'bg-[var(--bg3)] text-[var(--dark5)]'
              }`}>
                {section.completed ? '\u2713' : '\u2022'}
              </span>
              <span className={section.completed ? 'text-[var(--dark3)]' : 'text-[var(--dark5)]'}>
                {t(`sections.${section.sectionType}`)}
              </span>
            </div>
          ))}
        </div>

        {/* Action button */}
        {assessment.status !== 'completed' && (
          <button
            onClick={() => router.push(`/${locale}/tools/${toolId}/fria/${assessment.fRIAAssessmentId}`)}
            className="w-full px-4 py-2.5 rounded-lg bg-[var(--teal)] text-white text-[0.8125rem] font-semibold hover:opacity-90 transition-opacity"
          >
            {t('continueButton')}
          </button>
        )}
      </div>
    </div>
  );
}
