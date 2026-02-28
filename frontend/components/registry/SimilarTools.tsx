'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { RegistryTool } from '@/lib/registry';
import { getProviderName, getRiskStyles, getRiskLabel, getGradeColor, getPublicDocumentation, getDeployerObligationCount, computeWeightedGrade } from '@/lib/registry';
import { ToolLogo } from './ToolLogo';

interface SimilarToolsProps {
  tools: RegistryTool[];
}

export function SimilarTools({ tools }: SimilarToolsProps) {
  const locale = useLocale();

  if (!tools || tools.length === 0) return null;

  return (
    <div style={{ marginBottom: '2rem', marginTop: '2rem' }}>
      <h2 style={{
        fontFamily: 'var(--f-mono)',
        fontSize: '.5625rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: 'var(--dark5)',
        marginBottom: '1rem',
      }}>
        Similar Tools
      </h2>
      <div className="similar-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '.75rem',
      }}>
        {tools.slice(0, 4).map((tool) => {
          const publicDoc = getPublicDocumentation(tool);
          const weighted = publicDoc ? computeWeightedGrade(publicDoc) : null;
          const grade = weighted?.grade ?? null;
          const gradeColor = getGradeColor(grade);
          const wp = weighted?.weightedPercent ?? 0;
          const riskS = getRiskStyles(tool.riskLevel || 'minimal');
          const riskLabel = getRiskLabel(tool.riskLevel || '');
          const provider = getProviderName(tool.provider);
          const oblCount = getDeployerObligationCount(tool);
          const roleLabel = tool.aiActRole === 'provider' ? 'Provider' : tool.aiActRole === 'hybrid' ? 'Hybrid' : 'AI Product';

          return (
            <Link
              key={tool.registryToolId}
              href={`/${locale}/registry/${tool.slug}`}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--b)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                transition: '.2s',
                cursor: 'pointer',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--b2)';
                el.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--b)';
                el.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
                <ToolLogo name={tool.name} size="sm" />
                <div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: '.8125rem', fontWeight: 700, color: 'var(--dark)' }}>
                    {tool.name}
                  </div>
                  <div style={{ fontSize: '.5rem', color: 'var(--dark5)' }}>
                    {provider} &middot; {roleLabel}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', margin: '.375rem 0' }}>
                <span style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '.4375rem',
                  fontWeight: 700,
                  padding: '.0625rem .3125rem',
                  borderRadius: 3,
                  display: 'inline-block',
                  background: riskS.bg,
                  color: riskS.color,
                }}>
                  {riskLabel}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.375rem', marginLeft: '.375rem' }}>
                  <span style={{ fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: '.75rem', color: gradeColor }}>
                    {grade || '—'}
                  </span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '.5rem', color: 'var(--dark5)' }}>
                    {wp}%
                  </span>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.5rem', color: 'var(--dark5)' }}>
                {oblCount > 0 ? `${oblCount} obligations` : ''}
              </div>
            </Link>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 1024px) { .similar-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { .similar-grid { grid-template-columns: 1fr !important; } }
      ` }} />
    </div>
  );
}
