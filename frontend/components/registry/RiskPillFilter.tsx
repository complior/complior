'use client';

import React from 'react';

interface RiskPillFilterProps {
  active: string[];
  onToggle: (risk: string) => void;
  counts?: Record<string, number>;
}

const RISK_LEVELS = [
  { key: 'prohibited', label: 'Prohibited', color: 'var(--coral)', activeBg: 'rgba(248,113,113,.12)', activeBorder: 'rgba(248,113,113,.3)' },
  { key: 'high', label: 'High Risk', color: 'var(--amber)', activeBg: 'rgba(251,191,36,.1)', activeBorder: 'rgba(251,191,36,.3)' },
  { key: 'gpai', label: 'GPAI', color: 'var(--purple)', activeBg: 'rgba(167,139,250,.1)', activeBorder: 'rgba(167,139,250,.3)' },
  { key: 'limited', label: 'Limited', color: 'var(--blue)', activeBg: 'rgba(96,165,250,.1)', activeBorder: 'rgba(96,165,250,.3)' },
  { key: 'minimal', label: 'Minimal', color: 'var(--teal)', activeBg: 'rgba(52,211,153,.08)', activeBorder: 'rgba(52,211,153,.3)' },
];

export function RiskPillFilter({ active, onToggle, counts }: RiskPillFilterProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '2rem', alignItems: 'center' }}>
      {RISK_LEVELS.map((r) => {
        const isActive = active.includes(r.key);
        return (
          <button
            key={r.key}
            onClick={() => onToggle(r.key)}
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: '.625rem',
              fontWeight: 600,
              padding: '.3125rem .625rem',
              borderRadius: 100,
              border: isActive ? `1px solid ${r.activeBorder}` : '1px solid var(--b2)',
              background: isActive ? r.activeBg : 'var(--card)',
              color: isActive ? r.color : 'var(--dark4)',
              cursor: 'pointer',
              transition: '.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '.375rem',
              userSelect: 'none' as const,
            }}
            onMouseEnter={(e) => {
              if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = 'var(--dark4)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)';
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isActive ? '#fff' : r.color,
              }}
            />
            {r.label}
            {counts && counts[r.key] !== undefined && (
              <span style={{ opacity: 0.5 }}>{counts[r.key].toLocaleString()}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
