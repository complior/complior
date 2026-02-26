'use client';

import React from 'react';
import type { RegistryTool } from '@/lib/registry';
import { getProviderName, getScoreColor, getScoreLabel, getRiskStyles, getRiskLabel, getTransparencyColor } from '@/lib/registry';
import type { ToolValidation } from './toolValidation';
import { ToolLogo } from './ToolLogo';
import { ScoreBarLarge } from './ScoreBar';

interface ToolHeroProps {
  tool: RegistryTool;
  validation: ToolValidation;
}

export function ToolHero({ tool, validation }: ToolHeroProps) {
  const provider = getProviderName(tool.provider);
  const providerWebsite = typeof tool.provider === 'object' ? tool.provider?.website : null;
  const score = validation.score;
  const coverage = validation.coverage;
  const transparencyGrade = validation.transparencyGrade;
  const scoreColor = getScoreColor(score);
  const scoreVerbal = getScoreLabel(score);
  const riskStyles = getRiskStyles(tool.riskLevel || 'minimal');
  const riskLabel = getRiskLabel(tool.riskLevel || '');
  const categories = tool.category ? tool.category.split(',').map((c) => c.trim()) : [];
  const lastScanned = tool.assessments?.['eu-ai-act']?.assessed_at || null;
  const tgColor = getTransparencyColor(transparencyGrade);

  const riskDescriptions: Record<string, string> = {
    prohibited: 'Prohibited AI Practice',
    unacceptable: 'Prohibited AI Practice',
    high: 'High-Risk AI System',
    gpai_systemic: 'GPAI with Systemic Risk',
    gpai: 'General-Purpose AI System',
    limited: 'Limited Risk AI System',
    minimal: 'Minimal Risk AI System',
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 280px',
      gap: '2rem',
      marginBottom: '2rem',
      padding: '2rem',
      background: 'var(--card)',
      border: '1px solid var(--b)',
      borderRadius: 14,
    }}>
      {/* Left column */}
      <div style={{ display: 'flex', gap: '1.25rem' }}>
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
            {tool.name}
          </h1>
          <p style={{ fontSize: '.8125rem', color: 'var(--dark4)', margin: '.25rem 0 .625rem' }}>
            {provider}
            {providerWebsite && <> &middot; {new URL(providerWebsite).hostname}</>}
          </p>
          {categories.length > 0 && (
            <div style={{ display: 'flex', gap: '.375rem', flexWrap: 'wrap', marginBottom: '.75rem' }}>
              {categories.map((cat) => (
                <span
                  key={cat}
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: '.5rem',
                    fontWeight: 600,
                    padding: '.125rem .4375rem',
                    borderRadius: 4,
                    background: 'var(--card2)',
                    border: '1px solid var(--b)',
                    color: 'var(--dark4)',
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
          {tool.description && (
            <p style={{ fontSize: '.75rem', color: 'var(--dark4)', maxWidth: 500, lineHeight: 1.6 }}>
              {tool.description.length > 200 ? `${tool.description.substring(0, 200)}...` : tool.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
            {providerWebsite && (
              <a
                href={providerWebsite}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '.75rem', color: 'var(--teal)', fontWeight: 600, transition: '.2s', display: 'flex', alignItems: 'center', gap: '.25rem', textDecoration: 'none' }}
              >
                Visit website &#x2197;
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Right column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '2rem', borderLeft: '1px solid var(--b)' }}>
        {/* Risk card */}
        <div style={{
          textAlign: 'center',
          padding: '1rem',
          borderRadius: 'var(--radius)',
          background: riskStyles.bg,
          border: riskStyles.border,
        }}>
          <div style={{
            fontFamily: 'var(--f-mono)',
            fontSize: '.4375rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            color: riskStyles.color,
            marginBottom: '.25rem',
          }}>
            Risk Classification
          </div>
          <div style={{
            fontFamily: 'var(--f-display)',
            fontSize: '1.125rem',
            fontWeight: 800,
            color: riskStyles.color,
          }}>
            {riskLabel}
          </div>
          <div style={{ fontSize: '.5625rem', color: 'var(--dark4)', marginTop: '.125rem' }}>
            {riskDescriptions[tool.riskLevel || ''] || 'AI System'}
          </div>
        </div>

        {/* Compliance Score */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--f-mono)',
            fontSize: '.4375rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            color: 'var(--dark5)',
            marginBottom: '.5rem',
          }}>
            Compliance Score
          </div>
          {score !== null ? (
            <>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: '2.5rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                {score} <span style={{ fontSize: '1rem', color: 'var(--dark5)', fontWeight: 400 }}>/100</span>
              </div>
              <ScoreBarLarge score={score} />
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.5rem', color: scoreColor }}>
                {scoreVerbal}
              </div>
            </>
          ) : (
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.625rem', color: 'var(--dark5)', padding: '.5rem 0' }}>
              Insufficient data &mdash; no score available
            </div>
          )}
        </div>

        {/* Coverage + Transparency row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
          {/* Coverage */}
          <div style={{
            textAlign: 'center',
            padding: '.625rem',
            borderRadius: 'var(--radius)',
            background: 'var(--card2)',
            border: '1px solid var(--b)',
          }}>
            <div style={{
              fontFamily: 'var(--f-mono)',
              fontSize: '.375rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              color: 'var(--dark5)',
              marginBottom: '.25rem',
            }}>
              Coverage
            </div>
            <div style={{
              fontFamily: 'var(--f-display)',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: coverage !== null && coverage > 0 ? 'var(--dark)' : 'var(--dark5)',
            }}>
              {coverage !== null ? `${coverage}%` : 'N/A'}
            </div>
          </div>

          {/* Transparency Grade */}
          <div style={{
            textAlign: 'center',
            padding: '.625rem',
            borderRadius: 'var(--radius)',
            background: 'var(--card2)',
            border: '1px solid var(--b)',
          }}>
            <div style={{
              fontFamily: 'var(--f-mono)',
              fontSize: '.375rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              color: 'var(--dark5)',
              marginBottom: '.25rem',
            }}>
              Transparency
            </div>
            <div style={{
              fontFamily: 'var(--f-display)',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: tgColor,
            }}>
              {transparencyGrade || 'N/A'}
            </div>
          </div>
        </div>

        {lastScanned && (
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.4375rem', color: 'var(--dark5)', textAlign: 'center' }}>
            Last scanned: {lastScanned}
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 280px"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="padding-left: 2rem"] {
            padding-left: 0 !important;
            border-left: 0 !important;
            border-top: 1px solid var(--b) !important;
            padding-top: 1rem !important;
            flex-direction: row !important;
            gap: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
