'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { RegistryTool } from '@/lib/registry';
import { getProviderName, getToolGrade, getGradeColor, getPublicDocumentation, getDeployerObligationCount } from '@/lib/registry';
import { ToolLogo } from './ToolLogo';
import { RiskBadge } from './RiskBadge';

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
          const gradeColor = getGradeColor(grade);
          const publicDoc = getPublicDocumentation(tool);
          const found = publicDoc?.score ?? 0;
          const total = publicDoc?.total ?? 9;
          const oblCount = getDeployerObligationCount(tool);
          const provider = getProviderName(tool.provider);
          const roleLabel = tool.aiActRole === 'provider' ? 'Provider' : tool.aiActRole === 'hybrid' ? 'Hybrid' : tool.aiActRole === 'infrastructure' ? 'Infrastructure' : 'AI Product';

          return (
            <Link
              key={tool.registryToolId}
              href={`/${locale}/registry/${tool.slug}`}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--b)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                cursor: 'pointer',
                transition: '.3s',
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: '.5rem',
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
              {/* Top: logo + name + provider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <ToolLogo name={tool.name} size="sm" />
                <div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: '.8125rem', fontWeight: 700, color: 'var(--dark)', lineHeight: 1.2 }}>
                    {tool.name}
                  </div>
                  <div style={{ fontSize: '.5625rem', color: 'var(--dark5)' }}>
                    {provider} &middot; {roleLabel}
                  </div>
                </div>
              </div>
              {/* Middle: risk badge + doc grade inline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                {tool.riskLevel && <RiskBadge risk={tool.riskLevel} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.375rem' }}>
                  <span style={{ fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: '.8125rem', color: gradeColor }}>
                    {grade || '—'}
                  </span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '.5rem', color: 'var(--dark5)' }}>
                    {found}/{total}
                  </span>
                  <div style={{ width: 40, height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, width: total > 0 ? `${(found / total) * 100}%` : '0%', background: gradeColor }} />
                  </div>
                </div>
              </div>
              {/* Bottom: obligation count */}
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.5rem', color: 'var(--dark5)' }}>
                {oblCount > 0 ? `${oblCount} deployer obligations` : ''}
              </div>
            </Link>
          );
        })}
      </div>
      <style jsx>{`
        @media (max-width: 1024px) {
          div[style*="grid-template-columns: repeat(5"] {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(5"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          div[style*="grid-template-columns: repeat(5"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
