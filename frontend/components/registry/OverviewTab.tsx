import React from 'react';
import type { RegistryTool } from '@/lib/registry';
import { getRiskLabel, getToolAssessment, getPublicDocumentation, getGradeColor } from '@/lib/registry';
import type { ToolValidation } from './toolValidation';

interface OverviewTabProps {
  tool: RegistryTool;
  validation: ToolValidation;
}

export function OverviewTab({ tool, validation }: OverviewTabProps) {
  const riskLabel = getRiskLabel(tool.riskLevel || '');
  const assessment = getToolAssessment(tool);
  const obligationIds = assessment?.applicable_obligation_ids || [];
  const deployerObligations = assessment?.deployer_obligations || [];
  const publicDoc = getPublicDocumentation(tool);

  return (
    <>
      {/* Description */}
      {tool.description && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={secHStyle}>
            Why this tool is classified as {riskLabel}
          </div>
          <p style={{
            fontSize: '.9375rem',
            color: 'var(--dark3)',
            lineHeight: 1.8,
            maxWidth: 700,
            marginBottom: '2rem',
          }}>
            {tool.description}
          </p>
        </div>
      )}

      {/* Public Documentation Checklist */}
      {publicDoc && publicDoc.items.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={secHStyle}>
            Public Documentation Checklist
            <span style={{
              marginLeft: '.5rem',
              fontWeight: 800,
              color: getGradeColor(publicDoc.grade),
            }}>
              {publicDoc.score}/{publicDoc.total}
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '.5rem',
          }}>
            {publicDoc.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.5rem',
                  padding: '.625rem .875rem',
                  borderRadius: 'var(--radius)',
                  background: item.found ? 'rgba(52,211,153,.04)' : 'var(--card2)',
                  border: `1px solid ${item.found ? 'rgba(52,211,153,.15)' : 'var(--b)'}`,
                }}
              >
                <span style={{
                  fontSize: '.75rem',
                  lineHeight: 1,
                  flexShrink: 0,
                }}>
                  {item.found ? '\u2705' : '\u274C'}
                </span>
                <span style={{
                  fontFamily: 'var(--f-display)',
                  fontSize: '.75rem',
                  fontWeight: 600,
                  color: item.found ? 'var(--dark)' : 'var(--dark5)',
                }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deployer Obligation Preview */}
      {deployerObligations.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={secHStyle}>Deployer Obligations Preview</div>
          {deployerObligations.slice(0, 6).map((obl, idx) => (
            <div
              key={obl.obligation_id || idx}
              style={{
                border: '1px solid var(--b)',
                borderRadius: 'var(--radius)',
                marginBottom: '.625rem',
                overflow: 'hidden',
                transition: '.2s',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '.75rem',
                padding: '1rem 1.25rem',
              }}>
                <span style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '.6875rem',
                  fontWeight: 700,
                  color: 'var(--dark)',
                  minWidth: 48,
                }}>
                  {obl.article || obl.obligation_id}
                </span>
                <span style={{
                  fontFamily: 'var(--f-display)',
                  fontSize: '.875rem',
                  fontWeight: 700,
                  color: 'var(--dark)',
                  flex: 1,
                }}>
                  {obl.title}
                </span>
                <div style={{ display: 'flex', gap: '.375rem' }}>
                  {obl.severity && (
                    <span
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: '.4375rem',
                        fontWeight: 700,
                        padding: '.0625rem .375rem',
                        borderRadius: 3,
                        whiteSpace: 'nowrap',
                        ...getSeverityStyle(obl.severity),
                      }}
                    >
                      {obl.severity.toUpperCase()}
                    </span>
                  )}
                  {obl.deadline && (
                    <span
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: '.4375rem',
                        fontWeight: 700,
                        padding: '.0625rem .375rem',
                        borderRadius: 3,
                        whiteSpace: 'nowrap',
                        background: 'rgba(96,165,250,.08)',
                        color: 'var(--blue)',
                      }}
                    >
                      {obl.deadline}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Risk Reasoning */}
      {assessment?.risk_reasoning && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={secHStyle}>Risk Assessment Reasoning</div>
          <p style={{
            fontSize: '.8125rem',
            color: 'var(--dark4)',
            lineHeight: 1.7,
            maxWidth: 700,
          }}>
            {assessment.risk_reasoning}
          </p>
        </div>
      )}

      {/* Fallback for tools without structured data */}
      {!tool.description && deployerObligations.length === 0 && !assessment?.risk_reasoning && !publicDoc && (
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

function getSeverityStyle(severity: string): React.CSSProperties {
  const lower = severity.toLowerCase();
  if (lower === 'high' || lower === 'critical') return { background: 'rgba(248,113,113,.08)', color: 'var(--coral)' };
  if (lower === 'medium') return { background: 'rgba(251,191,36,.08)', color: 'var(--amber)' };
  if (lower === 'low') return { background: 'rgba(52,211,153,.08)', color: 'var(--teal)' };
  return { background: 'var(--card2)', color: 'var(--dark4)' };
}
