'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { RiskBadge } from './RiskBadge';
import { api, type CatalogTool } from '@/lib/api';

interface AlternativesSectionProps {
  riskLevel: string;
  domain: string;
  currentToolName: string;
}

export function AlternativesSection({ riskLevel, domain, currentToolName }: AlternativesSectionProps) {
  const t = useTranslations('toolDetail');
  const locale = useLocale();
  const [alternatives, setAlternatives] = useState<CatalogTool[]>([]);

  const showAlternatives = riskLevel === 'high' || riskLevel === 'prohibited';

  useEffect(() => {
    if (!showAlternatives) return;
    api.catalog.search({ domain, pageSize: '6' })
      .then((res) => {
        const filtered = res.data.filter(
          (tool) =>
            tool.name !== currentToolName &&
            tool.defaultRiskLevel !== 'high' &&
            tool.defaultRiskLevel !== 'prohibited'
        );
        setAlternatives(filtered.slice(0, 3));
      })
      .catch(() => {});
  }, [showAlternatives, domain, currentToolName]);

  if (!showAlternatives || alternatives.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-[var(--b)]">
      <div className="font-display text-base font-bold text-[var(--dark)] mb-1">{t('alternatives')}</div>
      <div className="text-[0.8125rem] text-[var(--dark5)] mb-4">{t('alternativesDesc')}</div>

      <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        {alternatives.map((tool) => (
          <div
            key={tool.id}
            className="bg-[var(--card)] border border-[var(--b2)] rounded-[10px] p-4 transition-all hover:border-[var(--teal)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
          >
            <div className="text-sm font-bold text-[var(--dark)] mb-0.5">{tool.name}</div>
            <div className="text-[0.6875rem] text-[var(--dark5)] mb-1.5">{tool.vendor}</div>
            {tool.description && (
              <div className="text-[0.6875rem] text-[var(--dark4)] leading-snug mb-2.5 line-clamp-2">{tool.description}</div>
            )}
            <div className="flex items-center justify-between">
              <RiskBadge riskLevel={tool.defaultRiskLevel} />
              <Link
                href={`/${locale}/tools/catalog`}
                className="font-mono text-[0.4375rem] font-bold text-[var(--teal)] uppercase tracking-[0.04em] hover:underline"
              >
                {t('viewDetails')} &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
