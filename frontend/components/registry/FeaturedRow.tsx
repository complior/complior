'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { RegistryTool } from '@/lib/registry';
import { getProviderName, getToolGrade } from '@/lib/registry';
import { ToolLogo } from './ToolLogo';
import { RiskBadge } from './RiskBadge';
import { DocGradeBadge } from './DocGradeBadge';

interface FeaturedRowProps {
  tools: RegistryTool[];
}

export function FeaturedRow({ tools }: FeaturedRowProps) {
  const locale = useLocale();

  if (!tools || tools.length === 0) return null;

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{
        fontFamily: 'var(--f-mono)',
        fontSize: '.5625rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: 'var(--dark5)',
        marginBottom: '.875rem',
      }}>
        Featured
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '.75rem',
      }}>
        {tools.slice(0, 5).map((tool) => {
          const grade = getToolGrade(tool);
          return (
            <Link
              key={tool.registryToolId}
              href={`/${locale}/registry/${tool.slug}`}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--b)',
                borderRadius: 'var(--radius)',
                padding: '1.125rem',
                cursor: 'pointer',
                transition: '.3s',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--b2)';
                el.style.transform = 'translateY(-2px)';
                el.style.boxShadow = '0 8px 24px rgba(0,0,0,.08)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--b)';
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem', marginBottom: '.75rem' }}>
                <ToolLogo name={tool.name} size="sm" />
                <div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: '.875rem', fontWeight: 700, color: 'var(--dark)', lineHeight: 1.2 }}>
                    {tool.name}
                  </div>
                  <div style={{ fontSize: '.625rem', color: 'var(--dark5)' }}>
                    {getProviderName(tool.provider)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                {tool.riskLevel && <RiskBadge risk={tool.riskLevel} />}
                <DocGradeBadge grade={grade} size="sm" />
              </div>
            </Link>
          );
        })}
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(5"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
