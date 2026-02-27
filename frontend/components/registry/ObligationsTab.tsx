import React from 'react';
import type { RegistryTool } from '@/lib/registry';
import { getProviderName, getRiskLabel, getToolAssessment, isDeadlinePassed, getDeployerObligationCount } from '@/lib/registry';
import { getEffortForObligation, getTotalEffortHours } from '@/lib/registry-seo';

interface ObligationsTabProps {
  tool: RegistryTool;
}

export function ObligationsTab({ tool }: ObligationsTabProps) {
  const provider = getProviderName(tool.provider);
  const riskLabel = getRiskLabel(tool.riskLevel || '');
  const assessment = getToolAssessment(tool);
  const deployerObligations = assessment?.deployer_obligations || [];
  const providerObligations = assessment?.provider_obligations || [];
  const oblCount = getDeployerObligationCount(tool);
  const hours = getTotalEffortHours(tool);

  return (
    <>
      {/* Deployer obligations */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{
            fontFamily: 'var(--f-display)',
            fontSize: '1.125rem',
            fontWeight: 700,
            color: 'var(--dark)',
          }}>
            Your obligations as a {tool.name} deployer
          </h2>
          <div style={{
            fontFamily: 'var(--f-mono)',
            fontSize: '.625rem',
            color: 'var(--dark4)',
            marginTop: '.25rem',
          }}>
            {oblCount} obligations &middot; ~{hours} hours &middot; {riskLabel} context
          </div>
        </div>

        {deployerObligations.length > 0 ? (
          deployerObligations.map((obl, idx) => {
            const effort = getEffortForObligation(obl.title);
            const passed = obl.deadline ? isDeadlinePassed(obl.deadline) : false;
            const hasDeadline = !!obl.deadline;

            return (
              <div
                key={obl.obligation_id || idx}
                style={{
                  padding: '1rem 0',
                  borderBottom: idx < deployerObligations.length - 1 ? '1px solid var(--b)' : 'none',
                  display: 'flex',
                  gap: '.75rem',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  border: '2px solid var(--b2)', flexShrink: 0, marginTop: '.125rem',
                }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '.8125rem', color: 'var(--dark)', fontWeight: 600, display: 'block' }}>
                    {obl.title}
                  </strong>
                  {obl.evidence_summary && (
                    <p style={{ fontSize: '.6875rem', color: 'var(--dark4)', marginTop: '.125rem' }}>
                      {obl.evidence_summary}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '.75rem', marginTop: '.375rem', flexWrap: 'wrap' }}>
                    {/* Effort badge */}
                    <span style={{
                      fontFamily: 'var(--f-mono)', fontSize: '.5rem', color: 'var(--dark5)',
                      background: 'var(--bg2)', padding: '.125rem .375rem', borderRadius: 3,
                    }}>
                      {effort}
                    </span>
                    {/* Deadline badge */}
                    {hasDeadline && (
                      <span style={{
                        fontFamily: 'var(--f-mono)', fontSize: '.5rem',
                        padding: '.125rem .375rem', borderRadius: 3,
                        ...(passed
                          ? { background: 'rgba(248,113,113,.08)', color: 'var(--coral)' }
                          : { background: 'rgba(96,165,250,.08)', color: 'var(--blue)' }),
                      }}>
                        {passed ? 'PASSED' : ''} {obl.deadline}
                      </span>
                    )}
                    {!hasDeadline && (
                      <span style={{
                        fontFamily: 'var(--f-mono)', fontSize: '.5rem',
                        padding: '.125rem .375rem', borderRadius: 3,
                        background: 'var(--card2)', color: 'var(--dark5)',
                      }}>
                        {obl.status === 'conditional' ? 'Conditional' : 'Ongoing'}
                      </span>
                    )}
                  </div>
                  {/* Action CTA */}
                  {obl.article && (
                    <span style={{
                      fontFamily: 'var(--f-mono)', fontSize: '.5625rem', color: 'var(--teal)',
                      fontWeight: 600, marginTop: '.375rem', display: 'inline-block',
                      cursor: 'pointer',
                    }}>
                      Generate compliance document →
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '1rem 0', color: 'var(--dark4)', fontSize: '.8125rem' }}>
            Deployer obligations are being compiled for this tool.
          </div>
        )}

        {/* Track compliance CTA */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1.25rem',
          background: 'var(--card2)',
          border: '1px solid var(--b2)',
          borderRadius: 'var(--radius)',
          textAlign: 'center',
        }}>
          <h4 style={{ fontFamily: 'var(--f-display)', fontSize: '.875rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '.25rem' }}>
            Track your progress
          </h4>
          <p style={{ fontSize: '.75rem', color: 'var(--dark4)', marginBottom: '.75rem' }}>
            Sign up to track obligations, receive deadline reminders, and generate audit packages.
          </p>
          <button style={{
            display: 'inline-block',
            fontFamily: 'var(--f-mono)', fontSize: '.6875rem', fontWeight: 700,
            color: '#fff', background: 'var(--teal)',
            border: 'none', borderRadius: 6, padding: '.5rem 1rem',
            cursor: 'pointer', transition: '.2s',
          }}>
            Start tracking {tool.name} compliance →
          </button>
        </div>
      </div>

      {/* Provider obligations */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          fontFamily: 'var(--f-display)',
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--dark)',
          opacity: 0.6,
          marginBottom: '.25rem',
        }}>
          {provider}&apos;s obligations as provider
        </div>
        <div style={{ fontSize: '.8125rem', color: 'var(--dark4)', opacity: 0.6, marginBottom: '1rem' }}>
          These are {provider}&apos;s responsibility, not yours.
        </div>

        {providerObligations.length > 0 ? (
          providerObligations.map((obl, idx) => (
            <div
              key={obl.obligation_id || idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '.75rem',
                padding: '.75rem 0',
                borderBottom: idx < providerObligations.length - 1 ? '1px solid var(--b)' : 'none',
                opacity: 0.5,
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4,
                border: '2px solid var(--b2)', flexShrink: 0, marginTop: '.125rem', opacity: 0.4,
              }} />
              <div style={{ flex: 1, fontSize: '.8125rem', color: 'var(--dark3)', lineHeight: 1.6 }}>
                {obl.title}
                {obl.article && (
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '.625rem', color: 'var(--dark5)', marginLeft: '.5rem' }}>
                    ({obl.article})
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '1rem 0', color: 'var(--dark4)', fontSize: '.8125rem', opacity: 0.5 }}>
            Provider obligations are being compiled.
          </div>
        )}
      </div>
    </>
  );
}
