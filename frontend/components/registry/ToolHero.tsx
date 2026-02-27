'use client';

import React from 'react';
import type { RegistryTool } from '@/lib/registry';
import { getProviderName, getRiskLabel, getGradeColor, getPublicDocumentation, getToolAssessment, getDeployerObligationCount } from '@/lib/registry';
import { getTotalEffortHours } from '@/lib/registry-seo';
import type { ToolValidation } from './toolValidation';
import { ToolLogo } from './ToolLogo';

interface ToolHeroProps {
  tool: RegistryTool;
  validation: ToolValidation;
}

const riskDescriptions: Record<string, string> = {
  prohibited: 'Prohibited AI Practice',
  unacceptable: 'Prohibited AI Practice',
  high: 'High-Risk AI System',
  gpai_systemic: 'GPAI with Systemic Risk',
  gpai: 'General-Purpose AI System',
  limited: 'Limited Risk AI System',
  minimal: 'Minimal Risk AI System',
};

const riskArticles: Record<string, string> = {
  prohibited: 'Art. 5',
  unacceptable: 'Art. 5',
  high: 'Art. 6–15, 26–29',
  gpai_systemic: 'Art. 51–55',
  gpai: 'Art. 53–55',
  limited: 'Art. 50, 52',
  minimal: 'Voluntary',
};

const riskColors: Record<string, string> = {
  prohibited: 'var(--coral)',
  unacceptable: 'var(--coral)',
  high: 'var(--amber)',
  gpai_systemic: 'var(--purple)',
  gpai: 'var(--purple)',
  limited: 'var(--blue)',
  minimal: 'var(--teal)',
};

export function ToolHero({ tool, validation }: ToolHeroProps) {
  const provider = getProviderName(tool.provider);
  const providerWebsite = typeof tool.provider === 'object' ? tool.provider?.website : null;
  const riskLabel = getRiskLabel(tool.riskLevel || '');
  const riskLevel = tool.riskLevel || 'minimal';
  const categories = tool.category ? tool.category.split(',').map((c) => c.trim()) : [];

  const publicDoc = getPublicDocumentation(tool);
  const grade = publicDoc?.grade ?? null;
  const gradeColor = getGradeColor(grade);
  const found = publicDoc?.score ?? 0;
  const total = publicDoc?.total ?? 9;

  const oblCount = getDeployerObligationCount(tool);
  const hours = getTotalEffortHours(tool);
  const assessment = getToolAssessment(tool);
  const deployerObligations = assessment?.deployer_obligations || [];
  const topObligations = deployerObligations.slice(0, 4);

  const roleLabel = tool.aiActRole === 'provider' ? 'Provider'
    : tool.aiActRole === 'hybrid' ? 'Hybrid'
    : tool.aiActRole === 'infrastructure' ? 'Infrastructure'
    : tool.aiActRole === 'ai_feature' ? 'AI Feature'
    : 'AI Product';

  return (
    <div style={{
      padding: '1.5rem',
      background: 'var(--card)',
      border: '1px solid var(--b)',
      borderRadius: 14,
      marginBottom: '2rem',
    }}>
      {/* Hero top: logo + info */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <ToolLogo name={tool.name} size="lg" />
        <div>
          <h1 style={{
            fontFamily: 'var(--f-display)',
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--dark)',
            lineHeight: 1.2,
            letterSpacing: '-.02em',
            margin: 0,
          }}>
            {tool.name}{' '}
            <span style={{
              display: 'block',
              fontSize: '1rem',
              fontWeight: 500,
              color: 'var(--dark4)',
              letterSpacing: 0,
              marginTop: '.125rem',
            }}>
              AI Compliance Guide
            </span>
          </h1>
          <p style={{ fontSize: '.8125rem', color: 'var(--dark4)', margin: '.25rem 0 .5rem' }}>
            {provider}
            {providerWebsite && <> &middot; {new URL(providerWebsite).hostname}</>}
          </p>
          <div style={{ display: 'flex', gap: '.375rem', flexWrap: 'wrap', marginBottom: '.5rem' }}>
            <span style={{
              fontFamily: 'var(--f-mono)', fontSize: '.5rem', fontWeight: 600,
              padding: '.125rem .4375rem', borderRadius: 4,
              background: 'var(--teal-dim)', color: 'var(--teal)',
              border: '1px solid rgba(52,211,153,.15)',
            }}>
              {roleLabel}
            </span>
            {categories.map((cat) => (
              <span key={cat} style={{
                fontFamily: 'var(--f-mono)', fontSize: '.5rem', fontWeight: 600,
                padding: '.125rem .4375rem', borderRadius: 4,
                background: 'var(--card2)', border: '1px solid var(--b)', color: 'var(--dark4)',
              }}>
                {cat}
              </span>
            ))}
          </div>
          <p style={{ fontSize: '.75rem', color: 'var(--dark4)' }}>
            {providerWebsite && (
              <>
                <a href={providerWebsite} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
                  Visit website &#x2197;
                </a>
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── 3-column metrics ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr 1fr',
        gap: 0,
        borderTop: '1px solid var(--b)',
        marginTop: '1.25rem',
        paddingTop: '1.25rem',
      }}>
        {/* Column 1: Risk Classification */}
        <div style={{ padding: '0 1.5rem 0 0', borderRight: '1px solid var(--b)' }}>
          <div style={labelStyle}>{'\u2460'} Risk Classification</div>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.25rem', fontWeight: 800, color: riskColors[riskLevel] || 'var(--dark)', marginBottom: '.125rem' }}>
            {riskLabel}
          </div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.5rem', color: 'var(--dark5)', marginBottom: '.25rem' }}>
            {riskArticles[riskLevel] || ''}
          </div>
          <div style={{ fontSize: '.6875rem', color: 'var(--dark4)', lineHeight: 1.5 }}>
            {riskDescriptions[riskLevel] || 'AI System'}
          </div>
          {(riskLevel.startsWith('gpai') || riskLevel === 'limited') && (
            <div style={{ fontSize: '.5625rem', color: 'var(--dark5)', fontStyle: 'italic', marginTop: '.375rem' }}>
              Risk depends on YOUR use case (see below)
            </div>
          )}
        </div>

        {/* Column 2: Documentation */}
        <div style={{ padding: '0 1.5rem', borderRight: '1px solid var(--b)' }}>
          <div style={labelStyle}>{'\u2461'} Public Documentation</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem', marginBottom: '.625rem' }}>
            <span style={{ fontFamily: 'var(--f-display)', fontSize: '2rem', fontWeight: 800, color: gradeColor }}>
              {grade || '—'}
            </span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '.75rem', color: 'var(--dark4)' }}>
              {found} / {total} documents found
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', marginBottom: '.75rem' }}>
            <div style={{ height: '100%', borderRadius: 3, width: total > 0 ? `${(found / total) * 100}%` : '0%', background: gradeColor }} />
          </div>
          {/* 9-item checklist */}
          {publicDoc?.items && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
              {publicDoc.items.map((item) => (
                <div key={item.id} style={{ fontFamily: 'var(--f-mono)', fontSize: '.5625rem', color: 'var(--dark4)', display: 'flex', alignItems: 'center', gap: '.375rem' }}>
                  <span style={{ color: item.found ? 'var(--teal)' : 'var(--coral)' }}>
                    {item.found ? '\u2705' : '\u274C'}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Obligations */}
        <div style={{ padding: '0 0 0 1.5rem' }}>
          <div style={labelStyle}>{'\u2462'} Your Obligations</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '.375rem', marginBottom: '.125rem' }}>
            <span style={{ fontFamily: 'var(--f-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--dark)', lineHeight: 1 }}>
              {oblCount}
            </span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '.5625rem', color: 'var(--dark4)' }}>
              obligations apply
            </span>
          </div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.5rem', color: 'var(--dark5)', marginBottom: '.625rem' }}>
            ~{hours} hours estimated
          </div>
          {topObligations.length > 0 && (
            <>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.4375rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--dark5)', marginBottom: '.375rem' }}>
                Critical:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                {topObligations.map((obl, idx) => (
                  <div key={idx} style={{ fontSize: '.625rem', color: 'var(--dark3)', display: 'flex', alignItems: 'center', gap: '.375rem' }}>
                    <span style={{ color: 'var(--dark5)', fontSize: '.5rem' }}>{'\u25A1'}</span>
                    {obl.title}{obl.article ? ` (${obl.article})` : ''}
                  </div>
                ))}
              </div>
            </>
          )}
          {riskLevel.startsWith('gpai') && (
            <div style={{ fontSize: '.5625rem', color: 'var(--amber)', marginTop: '.625rem', paddingTop: '.5rem', borderTop: '1px solid var(--b)' }}>
              If used for HR/credit/legal:<br />+12 more obligations incl. FRIA (Art. 27)
            </div>
          )}
          <button
            style={{
              display: 'inline-block',
              marginTop: '.625rem',
              fontFamily: 'var(--f-mono)',
              fontSize: '.5625rem',
              fontWeight: 700,
              color: 'var(--teal)',
              background: 'var(--teal-dim)',
              border: '1px solid rgba(52,211,153,.15)',
              borderRadius: 6,
              padding: '.3125rem .625rem',
              cursor: 'pointer',
              transition: '.2s',
            }}
          >
            Track compliance →
          </button>
        </div>
      </div>

      {/* Responsive styles */}
      <style jsx>{`
        @media (max-width: 1024px) {
          div[style*="grid-template-columns: 180px 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="padding: 0 1.5rem 0 0"] {
            padding: 1rem 0 !important;
            border-right: 0 !important;
            border-bottom: 1px solid var(--b) !important;
          }
          div[style*="padding: 0 1.5rem"][style*="border-right"] {
            padding: 1rem 0 !important;
            border-right: 0 !important;
            border-bottom: 1px solid var(--b) !important;
          }
          div[style*="padding: 0 0 0 1.5rem"] {
            padding: 1rem 0 0 !important;
          }
        }
        @media (max-width: 640px) {
          div[style*="display: flex"][style*="gap: 1.25rem"] {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--f-mono)',
  fontSize: '.4375rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  color: 'var(--dark5)',
  marginBottom: '.625rem',
};
