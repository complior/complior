import React from 'react';

interface RiskBadgeProps {
  risk: string;
  size?: 'sm' | 'lg';
}

const RISK_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  prohibited: { bg: 'rgba(248,113,113,.1)', color: 'var(--coral)', border: '1px solid rgba(248,113,113,.15)' },
  unacceptable: { bg: 'rgba(248,113,113,.1)', color: 'var(--coral)', border: '1px solid rgba(248,113,113,.15)' },
  high: { bg: 'rgba(251,191,36,.1)', color: 'var(--amber)', border: '1px solid rgba(251,191,36,.15)' },
  gpai_systemic: { bg: 'rgba(167,139,250,.1)', color: 'var(--purple)', border: '1px solid rgba(167,139,250,.15)' },
  gpai: { bg: 'rgba(167,139,250,.1)', color: 'var(--purple)', border: '1px solid rgba(167,139,250,.15)' },
  limited: { bg: 'rgba(96,165,250,.1)', color: 'var(--blue)', border: '1px solid rgba(96,165,250,.15)' },
  minimal: { bg: 'rgba(52,211,153,.08)', color: 'var(--teal)', border: '1px solid rgba(52,211,153,.15)' },
};

const RISK_LABELS: Record<string, string> = {
  prohibited: 'PROHIBITED',
  unacceptable: 'PROHIBITED',
  high: 'HIGH RISK',
  gpai_systemic: 'GPAI SYSTEMIC',
  gpai: 'GPAI',
  limited: 'LIMITED RISK',
  minimal: 'MINIMAL',
};

export function RiskBadge({ risk, size = 'sm' }: RiskBadgeProps) {
  const s = RISK_STYLES[risk] || RISK_STYLES.minimal;
  const label = RISK_LABELS[risk] || risk?.toUpperCase() || 'UNKNOWN';

  return (
    <span
      style={{
        fontFamily: 'var(--f-mono)',
        fontSize: size === 'lg' ? '.625rem' : '.5rem',
        fontWeight: 700,
        padding: '.125rem .4375rem',
        borderRadius: 3,
        background: s.bg,
        color: s.color,
        border: s.border,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
