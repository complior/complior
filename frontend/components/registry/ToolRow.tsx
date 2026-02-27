'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { RegistryTool } from '@/lib/registry';
import { getProviderName, getToolGrade, getGradeColor, getPublicDocumentation, getToolAssessment, getDeployerObligationCount } from '@/lib/registry';
import { ToolLogo } from './ToolLogo';
import { RiskBadge } from './RiskBadge';

interface ToolRowProps {
  tool: RegistryTool;
}

export function ToolRow({ tool }: ToolRowProps) {
  const locale = useLocale();
  const provider = getProviderName(tool.provider);
  const grade = getToolGrade(tool);
  const gradeColor = getGradeColor(grade);
  const publicDoc = getPublicDocumentation(tool);
  const found = publicDoc?.score ?? 0;
  const total = publicDoc?.total ?? 9;
  const oblCount = getDeployerObligationCount(tool);
  const isHighObl = oblCount >= 10;

  // Role badge
  const roleLabel = tool.aiActRole === 'provider' ? 'Provider'
    : tool.aiActRole === 'hybrid' ? 'Hybrid'
    : tool.aiActRole === 'infrastructure' ? 'Infrastructure'
    : tool.aiActRole === 'ai_feature' ? 'AI Feature'
    : 'AI Product';

  return (
    <Link
      href={`/${locale}/registry/${tool.slug}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '2.5rem 1fr auto 120px 100px 60px',
        gap: '.875rem',
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
        <div style={{ fontSize: '.5625rem', color: 'var(--dark5)', marginTop: '.125rem', display: 'flex', alignItems: 'center', gap: '.375rem', flexWrap: 'wrap' }}>
          <span>{provider}</span>
          <span style={{
            fontFamily: 'var(--f-mono)',
            fontSize: '.4375rem',
            fontWeight: 600,
            padding: '.0625rem .375rem',
            borderRadius: 3,
            background: 'var(--teal-dim)',
            color: 'var(--teal)',
            border: '1px solid rgba(52,211,153,.15)',
            textTransform: 'uppercase',
            letterSpacing: '.02em',
          }}>
            {roleLabel}
          </span>
          {tool.category && <span>{tool.category.split(',')[0]?.trim()}</span>}
        </div>
      </div>
      {tool.riskLevel && <RiskBadge risk={tool.riskLevel} />}
      {/* Doc Grade inline (letter + fraction + bar) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.375rem' }}>
        <span style={{ fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: '.9375rem', color: gradeColor }}>
          {grade || '—'}
        </span>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '.5rem', color: 'var(--dark5)' }}>
          {found}/{total}
        </span>
        <div style={{ width: 48, height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, width: total > 0 ? `${(found / total) * 100}%` : '0%', background: gradeColor }} />
        </div>
      </div>
      {/* Obligation count */}
      <span
        className="tool-obl-col"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: '.5625rem',
          color: isHighObl ? 'var(--amber)' : 'var(--dark4)',
          whiteSpace: 'nowrap',
        }}
      >
        {tool.riskLevel === 'prohibited' || tool.riskLevel === 'unacceptable' ? 'Banned' : oblCount > 0 ? `${oblCount} obligations` : ''}
      </span>
      {/* Chevron */}
      <span style={{ color: 'var(--dark5)', fontSize: '.75rem', marginLeft: 'auto', transition: 'transform .2s' }}>
        &#x203A;
      </span>
    </Link>
  );
}
