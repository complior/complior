'use client';

import { useTranslations } from 'next-intl';
import { RiskBadge } from './RiskBadge';
import type { RiskClassification } from '@/lib/api';

interface ClassificationTabProps {
  classification: RiskClassification | null;
  onClassify?: () => void;
  classifying?: boolean;
}

export function ClassificationTab({ classification, onClassify, classifying }: ClassificationTabProps) {
  const t = useTranslations('toolDetail');

  if (!classification) {
    return (
      <div className="text-center py-12 px-8">
        <svg className="mx-auto mb-3 opacity-40" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--dark5)" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <h3 className="font-display text-base font-bold text-[var(--dark4)] mb-1">{t('notYetClassified')}</h3>
        <p className="text-[0.8125rem] text-[var(--dark5)] mb-4">{t('classifyDesc')}</p>
        {onClassify && (
          <button
            onClick={onClassify}
            disabled={classifying}
            className="px-4 py-2 rounded-lg bg-[var(--teal)] text-white font-bold text-xs hover:bg-[var(--teal2)] transition-colors disabled:opacity-50"
          >
            {classifying ? '...' : t('classifyNow')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pt-6">
      {/* Method badge — design: cl-method */}
      <div className="inline-flex items-center gap-1.5 font-mono text-[0.5rem] font-bold uppercase tracking-[0.04em] px-2.5 py-1 rounded-md bg-[var(--bg2)] border border-[var(--b2)] text-[var(--dark4)] mb-5">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
        </svg>
        {t('ruleBasedClassification')}
      </div>

      {/* Risk + Confidence summary */}
      <div className="flex items-center gap-3 mb-5">
        <RiskBadge riskLevel={classification.riskLevel} className="text-base px-3 py-1" />
        <span className="font-display text-lg font-extrabold text-[var(--dark)]">{classification.confidence}%</span>
        <span className="text-[0.8125rem] text-[var(--dark5)]">{t('confidence')}</span>
      </div>

      {/* Matched Rules — design: cl-rule */}
      {classification.ruleResult?.matchedRules && classification.ruleResult.matchedRules.length > 0 && (
        <div className="space-y-2 mb-5">
          {classification.ruleResult.matchedRules.map((rule, i) => (
            <div key={i} className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg bg-[var(--bg2)] border border-[var(--b)] text-[0.8125rem] text-[var(--dark2)] leading-relaxed">
              <svg className="shrink-0 mt-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reasoning */}
      {classification.reasoning && (
        <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg bg-[var(--bg2)] border border-[var(--b)] text-[0.8125rem] text-[var(--dark2)] leading-relaxed mb-5">
          <svg className="shrink-0 mt-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="whitespace-pre-line">{classification.reasoning}</span>
        </div>
      )}

      {/* Article References — design: cl-arts */}
      {classification.articleReferences && classification.articleReferences.length > 0 && (
        <div className="mt-5">
          <div className="font-mono text-[0.4375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark4)] mb-2">
            {t('applicableArticles')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {classification.articleReferences.map((ref, i) => (
              <span
                key={i}
                className="font-mono text-[0.4375rem] font-bold px-1.5 py-0.5 rounded-[5px] bg-[var(--teal-dim)] text-[var(--teal)] border border-[var(--teal-glow)]"
                title={ref.text}
              >
                {ref.article}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Annex Category */}
      {classification.annexCategory && (
        <div className="mt-5 text-[0.8125rem]">
          <span className="font-mono text-[0.4375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark4)]">{t('annexCategory')}:</span>
          <span className="ml-2 text-[var(--dark)]">{classification.annexCategory}</span>
        </div>
      )}
    </div>
  );
}
