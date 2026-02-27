'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { RegistryTool } from '@/lib/registry';
import { getProviderName, getRiskStyles, getRiskLabel, getToolGrade } from '@/lib/registry';
import { ToolLogo } from './ToolLogo';
import { DocGradeBadge } from './DocGradeBadge';

interface SimilarToolsProps {
  tools: RegistryTool[];
}

export function SimilarTools({ tools }: SimilarToolsProps) {
  const locale = useLocale();

  if (!tools || tools.length === 0) return null;

  return (
    <div style={{ marginBottom: '2rem', marginTop: '2rem' }}>
      <div style={{
        fontFamily: 'var(--f-mono)',
        fontSize: '.5625rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: 'var(--dark5)',
        marginBottom: '1rem',
      }}>
        Similar Tools
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '.75rem',
      }}>
        {tools.slice(0, 4).map((tool) => {
          const grade = getToolGrade(tool);
          const riskS = getRiskStyles(tool.riskLevel || 'minimal');
          const riskLabel = getRiskLabel(tool.riskLevel || '');
          const provider = getProviderName(tool.provider);

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
                  <div style={{ fontSize: '.5625rem', color: 'var(--dark5)' }}>
                    {provider}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.375rem' }}>
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
                <DocGradeBadge grade={grade} size="sm" />
              </div>
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
