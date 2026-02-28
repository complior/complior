import React from 'react';
import type { RegistryTool } from '@/lib/registry';
import { getPublicDocumentation, getGradeColor, formatAssessedDate, computeWeightedGrade } from '@/lib/registry';

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

  const weighted = computeWeightedGrade(publicDoc);
  const gradeColor = getGradeColor(weighted.grade);
  const assessedAt = formatAssessedDate(publicDoc.gradedAt);

  // Split items into required and best practice
  const requiredItems = publicDoc.items.filter((i) => i.tier === 'required' || weighted.requiredTotal > 0);
  const bpItems = publicDoc.items.filter((i) => i.tier === 'best_practice');
  // If no tier data, split by known IDs
  const hasServerTiers = publicDoc.items.some((i) => i.tier);

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Large grade header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '.75rem', marginBottom: '.25rem' }}>
        <span style={{ fontFamily: 'var(--f-display)', fontSize: '2.5rem', fontWeight: 800, color: gradeColor }}>
          {weighted.grade}
        </span>
        <div>
          <div style={{ fontSize: '.875rem', color: 'var(--dark3)' }}>
            Public Documentation Grade
          </div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.625rem', color: 'var(--dark5)', marginTop: '.125rem' }}>
            {weighted.requiredFound}/{weighted.requiredTotal} required ({Math.round((weighted.requiredFound / Math.max(weighted.requiredTotal, 1)) * 100)}%)
            {' + '}
            {weighted.bpFound}/{weighted.bpTotal} best practice
            {' = '}
            {weighted.weightedPercent}%
          </div>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.5rem', color: 'var(--dark5)', marginBottom: '1.5rem' }}>
        Weighted: required items = 90%, best practice = 10% bonus
        {assessedAt ? ` · Scanned ${assessedAt}` : ''}
      </div>

      {/* Required items section */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          fontFamily: 'var(--f-mono)',
          fontSize: '.5rem',
          fontWeight: 700,
          color: 'var(--teal)',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          marginBottom: '.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '.375rem',
        }}>
          <span style={{
            background: 'var(--teal-dim)',
            color: 'var(--teal)',
            padding: '0 .25rem',
            borderRadius: 3,
            fontSize: '.4375rem',
          }}>LEGALLY REQUIRED</span>
          <span style={{ color: 'var(--dark5)', fontWeight: 400 }}>
            — drives 90% of grade
          </span>
        </div>
        {publicDoc.items
          .filter((item) => hasServerTiers ? item.tier === 'required' : true)
          .filter((item) => !hasServerTiers || item.tier === 'required')
          .map((item, idx, arr) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              isLast={idx === arr.length - 1}
              showLegalBasis
            />
          ))}
      </div>

      {/* Best practice items section */}
      {(hasServerTiers ? publicDoc.items.filter((i) => i.tier === 'best_practice') : []).length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            fontFamily: 'var(--f-mono)',
            fontSize: '.5rem',
            fontWeight: 700,
            color: 'var(--blue)',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            marginBottom: '.5rem',
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '.375rem',
          }}>
            <span style={{
              background: 'rgba(96,165,250,.08)',
              color: 'var(--blue)',
              padding: '0 .25rem',
              borderRadius: 3,
              fontSize: '.4375rem',
            }}>BEST PRACTICE</span>
            <span style={{ color: 'var(--dark5)', fontWeight: 400 }}>
              — adds up to 10% bonus
            </span>
          </div>
          {publicDoc.items
            .filter((item) => item.tier === 'best_practice')
            .map((item, idx, arr) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                isLast={idx === arr.length - 1}
                showLegalBasis={false}
              />
            ))}
        </div>
      )}

      {/* Non-tiered fallback: show all items together */}
      {!hasServerTiers && publicDoc.items.map((item, idx) => (
        <ChecklistItemRow
          key={item.id}
          item={item}
          isLast={idx === publicDoc.items.length - 1}
          showLegalBasis={false}
        />
      ))}

      {/* Total */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem', paddingTop: '1rem', borderTop: '2px solid var(--b2)', marginTop: '.5rem' }}>
        <span style={{ fontFamily: 'var(--f-display)', fontSize: '1.25rem', fontWeight: 800, color: gradeColor }}>
          {weighted.grade}
        </span>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '.625rem', color: 'var(--dark4)' }}>
          {weighted.weightedPercent}% weighted score
          ({weighted.requiredFound}/{weighted.requiredTotal} required + {weighted.bpFound}/{weighted.bpTotal} bonus)
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

function ChecklistItemRow({ item, isLast, showLegalBasis }: {
  item: { id: string; label: string; found: boolean; signal: string; tier?: string; legalBasis?: string | null };
  isLast: boolean;
  showLegalBasis: boolean;
}) {
  return (
    <div style={{ padding: '.75rem 0', borderBottom: isLast ? 'none' : '1px solid var(--b)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem' }}>
        <span style={{ fontSize: '1rem', flexShrink: 0, width: 20, textAlign: 'center' }}>
          {item.found ? '\u2705' : '\u274C'}
        </span>
        <span style={{ fontFamily: 'var(--f-display)', fontSize: '.8125rem', fontWeight: 700, color: 'var(--dark)', flex: 1 }}>
          {item.label}
        </span>
        {showLegalBasis && item.legalBasis && (
          <span style={{
            fontFamily: 'var(--f-mono)',
            fontSize: '.4375rem',
            color: 'var(--teal)',
            background: 'var(--teal-dim)',
            padding: '0 .25rem',
            borderRadius: 3,
            whiteSpace: 'nowrap',
          }}>
            {item.legalBasis}
          </span>
        )}
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
