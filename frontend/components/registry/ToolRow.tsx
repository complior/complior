'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { RegistryTool } from '@/lib/registry';
import { getProviderName, getToolGrade, getToolAssessment, getAiActRoleLabel } from '@/lib/registry';
import { ToolLogo } from './ToolLogo';
import { RiskBadge } from './RiskBadge';
import { DocGradeBadge } from './DocGradeBadge';

interface ToolRowProps {
  tool: RegistryTool;
}

export function ToolRow({ tool }: ToolRowProps) {
  const locale = useLocale();
  const provider = getProviderName(tool.provider);
  const grade = getToolGrade(tool);
  const roleLabel = getAiActRoleLabel(tool.aiActRole);

  // Extract obligation count from assessment
  const assessment = getToolAssessment(tool);
  const oblCount = assessment?.applicable_obligation_ids?.length ?? 0;

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
      {tool.aiActRole && (
        <span style={{
          fontFamily: 'var(--f-mono)',
          fontSize: '.4375rem',
          fontWeight: 600,
          padding: '.125rem .375rem',
          borderRadius: 4,
          background: 'var(--card2)',
          border: '1px solid var(--b)',
          color: 'var(--dark4)',
          whiteSpace: 'nowrap',
        }}>
          {roleLabel}
        </span>
      )}
      <DocGradeBadge grade={grade} size="sm" />
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.5rem', color: 'var(--dark5)', textAlign: 'right', minWidth: 60 }} className="tool-articles-col">
        {oblCount > 0 ? `${oblCount} obl.` : ''}
      </div>
    </Link>
  );
}
