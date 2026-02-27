import React from 'react';
import type { RegistryTool } from '@/lib/registry';
import { getPublicDocumentation, getGradeColor, formatAssessedDate } from '@/lib/registry';

interface DocumentationChecklistTabProps {
  tool: RegistryTool;
}

export function DocumentationChecklistTab({ tool }: DocumentationChecklistTabProps) {
  const publicDoc = getPublicDocumentation(tool);
  if (!publicDoc) {
    return (
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={secHStyle}>Public Documentation: Not Yet Graded</h2>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark4)', fontSize: '.875rem' }}>
          Documentation checklist is not yet available for this tool.
        </div>
      </div>
    );
  }

  const grade = publicDoc.grade;
  const gradeColor = getGradeColor(grade);
  const assessedAt = formatAssessedDate(publicDoc.gradedAt);
  const totalPoints = publicDoc.total * 11; // approximate points scale
  const earnedPoints = publicDoc.score * 11;

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Large grade header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '.75rem', marginBottom: '.25rem' }}>
        <span style={{ fontFamily: 'var(--f-display)', fontSize: '2.5rem', fontWeight: 800, color: gradeColor }}>
          {grade}
        </span>
        <div>
          <div style={{ fontSize: '.875rem', color: 'var(--dark3)' }}>
            Public Documentation: Grade {grade} ({publicDoc.score}/{publicDoc.total})
          </div>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.5rem', color: 'var(--dark5)', marginBottom: '1.5rem' }}>
        Source: Passive scan{assessedAt ? ` (${assessedAt})` : ''}
      </div>

      {/* Checklist items */}
      {publicDoc.items.map((item, idx) => (
        <div key={item.id} style={{ padding: '1rem 0', borderBottom: idx < publicDoc.items.length - 1 ? '1px solid var(--b)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0, width: 20, textAlign: 'center' }}>
              {item.found ? '\u2705' : '\u274C'}
            </span>
            <span style={{ fontFamily: 'var(--f-display)', fontSize: '.8125rem', fontWeight: 700, color: 'var(--dark)', flex: 1 }}>
              {item.label}
            </span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '.625rem', color: 'var(--dark4)' }}>
              {item.found ? '1/1' : '0/1'}
            </span>
          </div>
          {item.signal && (
            <div style={{
              fontFamily: 'var(--f-mono)',
              fontSize: '.5rem',
              color: item.found ? 'var(--teal)' : 'var(--coral)',
              marginLeft: '1.625rem',
              marginTop: '.125rem',
            }}>
              {item.found ? `Found: ${item.signal}` : 'Not found on website'}
            </div>
          )}
        </div>
      ))}

      {/* Total */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem', paddingTop: '1rem', borderTop: '2px solid var(--b2)', marginTop: '.5rem' }}>
        <span style={{ fontFamily: 'var(--f-display)', fontSize: '1.25rem', fontWeight: 800, color: gradeColor }}>
          {publicDoc.score}/{publicDoc.total}
        </span>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '.625rem', color: 'var(--dark4)' }}>
          → Grade {grade}
        </span>
      </div>

      {/* Vendor CTA */}
      <div style={{
        marginTop: '1.25rem',
        padding: '1rem',
        background: 'var(--card2)',
        border: '1px solid var(--b)',
        borderRadius: 'var(--radius)',
        fontSize: '.75rem',
        color: 'var(--dark4)',
      }}>
        Are you a vendor? Upload documentation to improve your grade.{' '}
        <a href="/vendor" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
          Vendor Self-Service →
        </a>
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
