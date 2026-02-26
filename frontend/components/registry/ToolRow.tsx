'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { RegistryTool } from '@/lib/registry';
import { getProviderName, getScoreColor, getToolScore, getToolAssessment, getTransparencyGrade, getTransparencyColor } from '@/lib/registry';
import { ToolLogo } from './ToolLogo';
import { RiskBadge } from './RiskBadge';

interface ToolRowProps {
  tool: RegistryTool;
}

export function ToolRow({ tool }: ToolRowProps) {
  const locale = useLocale();
  const score = getToolScore(tool);
  const color = getScoreColor(score);
  const provider = getProviderName(tool.provider);
  const tg = getTransparencyGrade(tool);
  const tgColor = getTransparencyColor(tg);

  // Extract applicable obligation IDs from assessment
  const assessment = getToolAssessment(tool);
  const articles = assessment?.applicable_obligation_ids?.slice(0, 3).join(', ') || '';

  return (
    <Link
      href={`/${locale}/registry/${tool.slug}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '2.5rem 1fr auto auto auto auto',
        gap: '1rem',
        alignItems: 'center',
        padding: '.875rem 1rem',
        background: 'var(--card)',
        border: '1px solid var(--b)',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        transition: '.25s',
        textDecoration: 'none',
        color: 'inherit',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--b2)';
        el.style.background = 'var(--card2)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--b)';
        el.style.background = 'var(--card)';
      }}
    >
      <ToolLogo name={tool.name} size="sm" />
      <div>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: '.875rem', fontWeight: 700, color: 'var(--dark)' }}>
          {tool.name}
        </div>
        <div style={{ fontSize: '.625rem', color: 'var(--dark5)', marginTop: '.125rem' }}>
          <span style={{ marginRight: '.5rem' }}>{provider}</span>
          {tool.category && <span>{tool.category}</span>}
        </div>
      </div>
      {tool.riskLevel && <RiskBadge risk={tool.riskLevel} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', minWidth: 100 }} className="tool-score-col">
        <span style={{ fontFamily: 'var(--f-display)', fontSize: '.875rem', fontWeight: 700, minWidth: 32, textAlign: 'right', color }}>
          {score !== null ? score : '\u2014'}
        </span>
        <div style={{ width: 60, height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: score !== null ? `${score}%` : '0%', background: color, borderRadius: 2 }} />
        </div>
      </div>
      {tg && (
        <span style={{
          fontFamily: 'var(--f-mono)',
          fontSize: '.5rem',
          fontWeight: 700,
          padding: '.125rem .375rem',
          borderRadius: 4,
          background: 'var(--card2)',
          border: '1px solid var(--b)',
          color: tgColor,
          minWidth: 24,
          textAlign: 'center',
        }}>
          {tg}
        </span>
      )}
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.5rem', color: 'var(--dark5)', textAlign: 'right', minWidth: 100 }} className="tool-articles-col">
        {articles}
      </div>
    </Link>
  );
}
