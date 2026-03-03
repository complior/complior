'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FRIAProgress } from '@/components/fria/FRIAProgress';
import { FRIASectionForm } from '@/components/fria/FRIASectionForm';
import { RiskBadge } from '@/components/tools/RiskBadge';
import { api, type FRIADetail } from '@/lib/api';

const SECTION_TIMES: Record<string, number> = {
  general_info: 3,
  affected_persons: 5,
  specific_risks: 10,
  human_oversight: 5,
  mitigation_measures: 10,
  monitoring_plan: 5,
};

export default function FRIAWizardPage() {
  const params = useParams<{ id: string; friaId: string }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('fria');

  const [data, setData] = useState<FRIADetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const friaId = Number(params.friaId);
  const toolId = Number(params.id);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.fria.getById(friaId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [friaId]);

  useEffect(() => {
    if (friaId) fetchData();
  }, [friaId, fetchData]);

  const handleSaveSection = useCallback(async (content: Record<string, unknown>, completed: boolean) => {
    if (!data) return;
    const section = data.sections[activeIndex];
    if (!section) return;

    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.fria.updateSection(friaId, section.sectionType, { content, completed });
      setData((prev) => {
        if (!prev) return prev;
        const newSections = [...prev.sections];
        newSections[activeIndex] = { ...newSections[activeIndex], ...updated };
        return { ...prev, sections: newSections };
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [data, activeIndex, friaId]);

  const handleNextSection = useCallback(() => {
    if (data && activeIndex < data.sections.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  }, [data, activeIndex]);

  const handlePreviousSection = useCallback(() => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  }, [activeIndex]);

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    try {
      await api.fria.updateStatus(friaId, 'review');
      router.push(`/${locale}/tools/${toolId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[960px] mx-auto px-6 pt-20 pb-12">
        <div className="space-y-4">
          <div className="h-4 w-48 animate-pulse rounded bg-[var(--bg2)]" />
          <div className="h-64 animate-pulse rounded-xl bg-[var(--bg2)]" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-[960px] mx-auto px-6 pt-20 pb-12">
        <div className="rounded-lg border border-[var(--coral)] bg-[rgba(231,76,60,0.06)] p-4">
          <p className="text-sm text-[var(--coral)]">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const activeSection = data.sections[activeIndex];
  const allCompleted = data.sections.every((s) => s.completed);
  const isReadOnly = data.assessment.status === 'completed';
  const completedCount = data.sections.filter((s) => s.completed).length;
  const totalCount = data.sections.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Calculate estimated remaining time
  const remainingMinutes = data.sections
    .filter((s) => !s.completed)
    .reduce((sum, s) => sum + (SECTION_TIMES[s.sectionType] || 5), 0);

  return (
    <div className="max-w-[960px] mx-auto px-6 pt-20 pb-12">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/${locale}/tools/${toolId}`)}
          className="text-[0.75rem] text-[var(--dark5)] hover:text-[var(--dark3)] mb-3 flex items-center gap-1 transition-colors"
        >
          <span>&larr;</span> {t('wizard.backToTool')}
        </button>

        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-xl font-bold text-[var(--dark3)]">{t('title')}</h1>
              {data.tool.riskLevel && <RiskBadge riskLevel={data.tool.riskLevel} />}
            </div>
            <p className="text-[0.8125rem] text-[var(--dark5)]">
              {data.tool.name}
            </p>
          </div>
          {saved && (
            <span className="text-[0.75rem] text-[#2ecc71] font-semibold">{t('saved')}</span>
          )}
        </div>

        {/* Overall progress bar */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[0.75rem] text-[var(--dark5)]">
              {t('wizard.overallProgress', { completed: completedCount, total: totalCount, percent })}
            </span>
            {remainingMinutes > 0 && (
              <span className="text-[0.6875rem] font-mono text-[var(--dark5)]">
                {t('wizard.estimatedRemaining', { minutes: remainingMinutes })}
              </span>
            )}
          </div>
          <div className="h-1.5 bg-[var(--bg3)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--teal)] rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--coral)] bg-[rgba(231,76,60,0.06)] p-3">
          <p className="text-[0.8125rem] text-[var(--coral)]">{error}</p>
        </div>
      )}

      {/* Layout: sidebar + main */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <FRIAProgress
            sections={data.sections}
            activeIndex={activeIndex}
            onNavigate={setActiveIndex}
          />

          {/* Submit for review */}
          {!isReadOnly && allCompleted && data.assessment.status !== 'review' && (
            <div className="mt-6 pt-4 border-t border-[var(--b)]">
              <button
                onClick={handleSubmitForReview}
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-lg bg-[#2ecc71] text-white text-[0.8125rem] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? t('saving') : t('submitReview')}
              </button>
            </div>
          )}
        </div>

        {/* Main form area */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-[var(--b)] p-6 bg-[var(--bg)]">
            {activeSection && (
              <FRIASectionForm
                key={activeSection.sectionType}
                section={activeSection}
                onSave={handleSaveSection}
                saving={saving}
                readOnly={isReadOnly}
                sectionIndex={activeIndex}
                totalSections={totalCount}
                onNext={handleNextSection}
                onPrevious={handlePreviousSection}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
