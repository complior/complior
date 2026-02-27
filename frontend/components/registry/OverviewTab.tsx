'use client';

import React, { useState } from 'react';
import type { RegistryTool } from '@/lib/registry';
import { getRiskLabel, getProviderName, getToolAssessment } from '@/lib/registry';
import { getArticleInfo } from '@/lib/registry-seo';
import type { ToolValidation } from './toolValidation';

interface OverviewTabProps {
  tool: RegistryTool;
  validation: ToolValidation;
}

const badgeStyles: Record<string, React.CSSProperties> = {
  required: { background: 'var(--teal-dim)', color: 'var(--teal)' },
  passed: { background: 'rgba(248,113,113,.08)', color: 'var(--coral)' },
  provider: { background: 'rgba(167,139,250,.08)', color: 'var(--purple)' },
  upcoming: { background: 'rgba(96,165,250,.08)', color: 'var(--blue)' },
};

export function OverviewTab({ tool, validation }: OverviewTabProps) {
  const riskLabel = getRiskLabel(tool.riskLevel || '');
  const provider = getProviderName(tool.provider);
  const assessment = getToolAssessment(tool);
  const articles = getArticleInfo(tool);
  const deployerObligations = assessment?.deployer_obligations || [];
  const providerObligations = assessment?.provider_obligations || [];

  const [openCards, setOpenCards] = useState<Set<string>>(new Set(articles[0]?.article ? [articles[0].article] : []));

  const toggleCard = (article: string) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(article)) next.delete(article); else next.add(article);
      return next;
    });
  };

  return (
    <>
      {/* Pulse animation for DEADLINE PASSED badge */}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes pulse-badge { 0%, 100% { opacity: 1; } 50% { opacity: .6; } }` }} />

      {/* Description */}
      {tool.description && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={secHStyle}>
            Why this tool is classified as {riskLabel}
          </h2>
          <p style={{
            fontSize: '.9375rem',
            color: 'var(--dark3)',
            lineHeight: 1.8,
            maxWidth: 700,
          }}>
            {tool.description}
          </p>
        </div>
      )}

      {/* Applicable Articles — accordion cards */}
      {articles.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={secHStyle}>Applicable Articles</h2>
          {articles.map((art) => {
            const isOpen = openCards.has(art.article);
            return (
              <div
                key={art.article}
                style={{
                  border: '1px solid var(--b)',
                  borderRadius: 'var(--radius)',
                  marginBottom: '.625rem',
                  overflow: 'hidden',
                  transition: '.2s',
                }}
              >
                <div
                  onClick={() => toggleCard(art.article)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '.75rem',
                    padding: '1rem 1.25rem',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: '.6875rem',
                    fontWeight: 700,
                    color: 'var(--dark)',
                    minWidth: 48,
                  }}>
                    {art.article}
                  </span>
                  <span style={{
                    fontFamily: 'var(--f-display)',
                    fontSize: '.875rem',
                    fontWeight: 700,
                    color: 'var(--dark)',
                    flex: 1,
                  }}>
                    {art.title}
                  </span>
                  <div style={{ display: 'flex', gap: '.375rem' }}>
                    {art.badges.map((badge, bi) => (
                      <span
                        key={bi}
                        style={{
                          fontFamily: 'var(--f-mono)',
                          fontSize: '.4375rem',
                          fontWeight: 700,
                          padding: '.0625rem .375rem',
                          borderRadius: 3,
                          whiteSpace: 'nowrap',
                          ...badgeStyles[badge.type],
                          ...(badge.type === 'passed' ? { animation: 'pulse-badge 2s ease infinite' } : {}),
                        }}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '.75rem',
                    color: 'var(--dark5)',
                    transition: 'transform .2s',
                    transform: isOpen ? 'rotate(90deg)' : 'none',
                  }}>
                    &#x203A;
                  </span>
                </div>
                {isOpen && (
                  <div style={{
                    padding: '0 1.25rem 1rem',
                    fontSize: '.8125rem',
                    color: 'var(--dark4)',
                    lineHeight: 1.7,
                    borderTop: '1px solid var(--b)',
                    paddingTop: '.75rem',
                  }}>
                    {art.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Who does what — 2-column grid */}
      {(deployerObligations.length > 0 || providerObligations.length > 0) && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={secHStyle}>Who does what</h2>
          <div className="wdw-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
          }}>
            {/* Provider column */}
            <div style={{ padding: '1.25rem', border: '1px solid var(--b)', borderRadius: 'var(--radius)' }}>
              <h4 style={{ fontFamily: 'var(--f-display)', fontSize: '.875rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '.75rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                {provider} (provider)
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '.4375rem', padding: '.0625rem .3125rem', borderRadius: 3, background: 'rgba(167,139,250,.08)', color: 'var(--purple)' }}>
                  Their job
                </span>
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '.375rem', padding: 0, margin: 0 }}>
                {providerObligations.slice(0, 5).map((obl, idx) => (
                  <li key={idx} style={{ fontSize: '.75rem', color: 'var(--dark3)', paddingLeft: '1rem', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--dark5)' }}>&bull;</span>
                    {obl.title}{obl.article ? ` (${obl.article})` : ''}
                  </li>
                ))}
                {providerObligations.length === 0 && (
                  <li style={{ fontSize: '.75rem', color: 'var(--dark5)' }}>Provider obligations being compiled</li>
                )}
              </ul>
            </div>

            {/* Deployer column */}
            <div style={{ padding: '1.25rem', border: '1px solid var(--b)', borderRadius: 'var(--radius)' }}>
              <h4 style={{ fontFamily: 'var(--f-display)', fontSize: '.875rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '.75rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                You (deployer)
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '.4375rem', padding: '.0625rem .3125rem', borderRadius: 3, background: 'var(--teal-dim)', color: 'var(--teal)' }}>
                  Your job
                </span>
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '.375rem', padding: 0, margin: 0 }}>
                {deployerObligations.slice(0, 5).map((obl, idx) => (
                  <li key={idx} style={{ fontSize: '.75rem', color: 'var(--dark3)', paddingLeft: '1rem', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--dark5)' }}>&bull;</span>
                    {obl.title}{obl.article ? ` (${obl.article})` : ''}
                  </li>
                ))}
                {deployerObligations.length === 0 && (
                  <li style={{ fontSize: '.75rem', color: 'var(--dark5)' }}>Deployer obligations being compiled</li>
                )}
              </ul>
              <a href="#obligations" style={{ display: 'inline-block', marginTop: '.75rem', fontFamily: 'var(--f-mono)', fontSize: '.5625rem', color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
                See full obligation checklist →
              </a>
            </div>
          </div>

          {/* Responsive: stack on mobile */}
          <style dangerouslySetInnerHTML={{ __html: `@media (max-width: 768px) { .wdw-grid { grid-template-columns: 1fr !important; } }` }} />
        </div>
      )}

      {/* Risk Reasoning */}
      {assessment?.risk_reasoning && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={secHStyle}>Risk Assessment Reasoning</h2>
          <p style={{ fontSize: '.8125rem', color: 'var(--dark4)', lineHeight: 1.7, maxWidth: 700 }}>
            {assessment.risk_reasoning}
          </p>
        </div>
      )}

      {/* Fallback */}
      {!tool.description && articles.length === 0 && !assessment?.risk_reasoning && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark4)', fontSize: '.875rem' }}>
          Detailed overview data is not yet available for this tool.
        </div>
      )}
    </>
  );
}

const secHStyle: React.CSSProperties = {
  fontFamily: 'var(--f-mono)',
  fontSize: '.5625rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  color: 'var(--dark5)',
  marginBottom: '1rem',
};
