'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { api, type GapAnalysisResult } from '@/lib/api';
import { CategoryCard } from '@/components/gap-analysis/CategoryCard';
import { ActionPlan } from '@/components/gap-analysis/ActionPlan';

export default function GapAnalysisPage() {
  const t = useTranslations('gapAnalysis');
  const params = useParams();
  const toolId = Number(params.toolId);
  const [result, setResult] = useState<GapAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.gapAnalysis.getByTool(toolId);
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error'));
      } finally {
        setLoading(false);
      }
    };
    if (toolId) load();
  }, [toolId, t]);

  const scoreColor = result
    ? result.overallScore >= 80 ? 'text-emerald-600'
    : result.overallScore >= 40 ? 'text-amber-600'
    : 'text-red-600'
    : '';

  return (
    <div className="mx-auto max-w-ctr px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--dark)]">{t('title')}</h1>
        <p className="mt-1 text-sm text-[var(--dark5)]">{t('subtitle')}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-[var(--coral)] bg-[var(--coral-dim)] p-4">
          <p className="text-sm text-[var(--coral)]">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="h-20 animate-pulse rounded-xl border border-[var(--b2)] bg-[var(--bg2)]" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl border border-[var(--b2)] bg-[var(--bg2)]" />
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <>
          {/* Score header */}
          <div className="mb-8 flex items-center gap-6 rounded-xl border border-[var(--b2)] bg-[var(--card)] p-6">
            <div>
              <p className="text-sm text-[var(--dark5)]">{result.toolName}</p>
              <p className="text-xs text-[var(--dark5)]">
                Risk Level: {result.riskLevel || 'Unclassified'}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-[var(--dark5)]">{t('overallScore')}</p>
              <p className={`text-3xl font-bold ${scoreColor}`}>{result.overallScore}%</p>
            </div>
          </div>

          {/* Category cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {result.categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>

          {/* Action Plan */}
          <div className="mt-8">
            <ActionPlan plan={result.actionPlan} />
          </div>
        </>
      )}
    </div>
  );
}
