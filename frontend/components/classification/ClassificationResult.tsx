'use client';

import { useTranslations } from 'next-intl';
import { RiskBadge } from '@/components/tools/RiskBadge';
import { Button } from '@/components/ui/Button';
import type { ClassifyResult } from '@/lib/api';

interface ClassificationResultProps {
  result: ClassifyResult;
  toolName: string;
  onViewTool: () => void;
  onBackToInventory: () => void;
}

export function ClassificationResult({ result, toolName, onViewTool, onBackToInventory }: ClassificationResultProps) {
  const t = useTranslations('toolDetail');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--dark)] font-display">{t('classificationTitle')}</h2>
        <p className="mt-1 text-[var(--dark5)]">{toolName}</p>
      </div>

      {/* Risk Level Badge */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--b2)] bg-[var(--card)] p-6">
        <RiskBadge riskLevel={result.riskLevel} className="text-lg px-4 py-1.5" />

        {/* Confidence Bar */}
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-[var(--dark5)] mb-1">
            <span>{t('confidence')}</span>
            <span>{result.confidence}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--bg2)]">
            <div
              className="h-2 rounded-full bg-[var(--teal)] transition-all"
              style={{ width: `${result.confidence}%` }}
            />
          </div>
        </div>

        {result.annexCategory && (
          <p className="text-sm text-[var(--dark4)]">{result.annexCategory}</p>
        )}
      </div>

      {/* Matched Rules / Reasoning */}
      <div className="rounded-xl border border-[var(--b2)] bg-[var(--card)] p-4">
        <h3 className="mb-2 text-sm font-semibold text-[var(--dark3)]">{t('classificationReasoning')}</h3>
        <ul className="space-y-1">
          {result.matchedRules.map((rule, i) => (
            <li key={i} className="text-sm text-[var(--dark4)]">
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Article References */}
      {result.articleReferences.length > 0 && (
        <div className="rounded-xl border border-[var(--b2)] bg-[var(--card)] p-4">
          <h3 className="mb-2 text-sm font-semibold text-[var(--dark3)]">{t('articleReferences')}</h3>
          <ul className="space-y-1">
            {result.articleReferences.map((ref, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 rounded bg-[var(--bg2)] px-1.5 py-0.5 text-xs font-medium text-[var(--dark4)]">
                  {ref.article}
                </span>
                <span className="text-[var(--dark4)]">{ref.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={onBackToInventory}>{t('backToInventory')}</Button>
        <Button onClick={onViewTool}>View Tool Details</Button>
      </div>
    </div>
  );
}
