'use client';

import { useTranslations } from 'next-intl';

const RISK_SEGMENTS: { key: string; color: string }[] = [
  { key: 'prohibited', color: 'var(--r-prohibited)' },
  { key: 'high', color: 'var(--r-high)' },
  { key: 'limited', color: 'var(--r-limited)' },
  { key: 'minimal', color: 'var(--r-minimal)' },
];

interface RiskDonutChartProps {
  riskDistribution: Record<string, number>;
}

export function RiskDonutChart({ riskDistribution }: RiskDonutChartProps) {
  const t = useTranslations('dashboard');

  const total = Object.values(riskDistribution).reduce((s, n) => s + n, 0);
  const circ = 2 * Math.PI * 14; // r=14
  let offset = circ * 0.25; // start at top

  const segments = RISK_SEGMENTS
    .map((s) => ({ ...s, count: riskDistribution[s.key] || 0 }))
    .filter((s) => s.count > 0);

  return (
    <div className="bg-[var(--card)] border border-[var(--b2)] rounded-xl p-5 transition-all dark:border-[var(--b3)]">
      {/* Header */}
      <div className="font-display text-[0.9375rem] font-bold text-[var(--dark)] mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 stroke-[var(--teal)]" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
        {t('riskDistribution')}
      </div>

      {total === 0 ? (
        <p className="text-[var(--dark5)] text-sm">{t('noClassifiedTools')}</p>
      ) : (
        <div className="flex items-center gap-6">
          {/* SVG Donut */}
          <div className="w-[110px] h-[110px] flex-shrink-0 relative">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              <circle cx="18" cy="18" r="14" fill="none" stroke="var(--bg3)" strokeWidth={4} />
              {segments.map((seg) => {
                const dash = circ * (seg.count / total);
                const gap = circ - dash;
                const currentOffset = offset;
                offset -= dash;
                return (
                  <circle
                    key={seg.key}
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={4}
                    strokeDasharray={`${dash.toFixed(1)} ${gap.toFixed(1)}`}
                    strokeDashoffset={currentOffset}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="font-display text-lg font-extrabold text-[var(--dark)] leading-none">{total}</div>
                <div className="font-mono text-[0.3125rem] font-semibold text-[var(--dark5)] uppercase tracking-[0.05em]">Tools</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1">
            {RISK_SEGMENTS.map((seg) => {
              const count = riskDistribution[seg.key] || 0;
              if (count === 0) return null;
              return (
                <div key={seg.key} className="flex items-center gap-2 py-1 px-1.5 rounded-[5px] cursor-pointer transition-colors hover:bg-[var(--teal-dim)] mb-0.5">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
                  <span className="text-xs text-[var(--dark2)] font-medium flex-1">
                    {t(seg.key as 'prohibited' | 'high' | 'limited' | 'minimal')}
                  </span>
                  <span className="font-mono text-xs font-bold" style={{ color: seg.color }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
