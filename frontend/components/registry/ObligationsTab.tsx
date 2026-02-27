import React from 'react';
import type { RegistryTool } from '@/lib/registry';
import { getProviderName, getRiskLabel, getToolAssessment } from '@/lib/registry';

interface ObligationsTabProps {
  tool: RegistryTool;
}

export function ObligationsTab({ tool }: ObligationsTabProps) {
  const provider = getProviderName(tool.provider);
  const riskLabel = getRiskLabel(tool.riskLevel || '');
  const assessment = getToolAssessment(tool);
  const deployerObligations = assessment?.deployer_obligations || [];
  const providerObligations = assessment?.provider_obligations || [];

  return (
    <>
      {/* Deployer obligations */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          fontFamily: 'var(--f-display)',
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--dark)',
          marginBottom: '.25rem',
        }}>
          Your obligations as a {tool.name} deployer
        </div>
        <div style={{
          fontSize: '.8125rem',
          color: 'var(--dark4)',
          marginBottom: '1rem',
        }}>
          {tool.name} is classified as {riskLabel}. As a deployer, these are your specific legal obligations.
        </div>

        {deployerObligations.length > 0 ? (
          deployerObligations.map((obl, idx) => (
            <div
              key={obl.obligation_id || idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '.75rem',
                padding: '.75rem 0',
                borderBottom: idx < deployerObligations.length - 1 ? '1px solid var(--b)' : 'none',
              }}
            >
              <div style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: '2px solid var(--b2)',
                flexShrink: 0,
                marginTop: '.125rem',
              }} />
              <div style={{ flex: 1, fontSize: '.8125rem', color: 'var(--dark3)', lineHeight: 1.6 }}>
                <span>{obl.title}</span>
                {obl.article && (
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '.625rem', color: 'var(--dark5)', marginLeft: '.5rem' }}>
                    ({obl.article})
                  </span>
                )}
                {obl.deadline && (
                  <span style={{ display: 'block', fontFamily: 'var(--f-mono)', fontSize: '.625rem', color: 'var(--teal)', fontWeight: 600, marginTop: '.125rem' }}>
                    Deadline: {obl.deadline}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '1rem 0', color: 'var(--dark4)', fontSize: '.8125rem' }}>
            Deployer obligations are being compiled for this tool.
          </div>
        )}
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
        <div style={{
          fontSize: '.8125rem',
          color: 'var(--dark4)',
          opacity: 0.6,
          marginBottom: '1rem',
        }}>
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
                width: 18,
                height: 18,
                borderRadius: 4,
                border: '2px solid var(--b2)',
                flexShrink: 0,
                marginTop: '.125rem',
                opacity: 0.4,
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
