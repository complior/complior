import React from 'react';
import type { RegistryTool } from '@/lib/registry';

interface HistoryTabProps {
  tool: RegistryTool;
}

export function HistoryTab({ tool }: HistoryTabProps) {
  // evidence can be an object (API v4) or array (legacy) — normalize to array
  const rawEvidence = tool.evidence;
  const evidence: Array<{ date: string; title: string; description?: string }> = Array.isArray(rawEvidence)
    ? rawEvidence
    : [];

  // If no explicit history entries, build from assessment date
  if (evidence.length === 0) {
    const assessedAt = tool.assessments?.['eu-ai-act']?.assessed_at;
    if (assessedAt) {
      const grade = tool.assessments?.['eu-ai-act']?.publicDocumentation?.grade;
      const score = tool.assessments?.['eu-ai-act']?.publicDocumentation?.score;
      const total = tool.assessments?.['eu-ai-act']?.publicDocumentation?.total;
      evidence.push({
        date: assessedAt,
        title: grade ? `Doc Grade: ${grade} (${score}/${total})` : 'Initial assessment completed',
        description: 'Automated scan by Complior registry',
      });
    }
  }

  if (evidence.length === 0) {
    return (
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={secHStyle}>Compliance History</h2>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark4)', fontSize: '.875rem' }}>
          No compliance history available yet.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h2 style={secHStyle}>Compliance History</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {evidence.map((ev, idx) => {
          // Try to parse date for <time> element
          const parsed = new Date(ev.date);
          const isValidDate = !isNaN(parsed.getTime());
          const isoDate = isValidDate ? parsed.toISOString().split('T')[0] : undefined;
          const isWarning = ev.title?.toLowerCase().includes('deadline') || ev.title?.toLowerCase().includes('passed');

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                padding: '.75rem 0',
                borderBottom: idx < evidence.length - 1 ? '1px solid var(--b)' : 'none',
              }}
            >
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.625rem', color: 'var(--dark5)', minWidth: 90 }}>
                {isValidDate ? (
                  <time dateTime={isoDate}>{ev.date}</time>
                ) : (
                  ev.date
                )}
              </div>
              <div>
                <div style={{ fontSize: '.8125rem', color: isWarning ? 'var(--coral)' : 'var(--dark)' }}>
                  {isWarning && '\u26A0 '}{ev.title}
                </div>
                {ev.description && (
                  <div style={{ fontSize: '.6875rem', color: 'var(--dark4)' }}>{ev.description}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
