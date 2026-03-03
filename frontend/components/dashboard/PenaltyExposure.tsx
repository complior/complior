'use client';

import { useTranslations } from 'next-intl';

interface PenaltyExposureProps {
  riskDistribution: Record<string, number>;
}

const PENALTY_TIERS: { key: string; badgeClass: string; maxPenalty: string }[] = [
  { key: 'prohibited', badgeClass: 'bg-[rgba(184,66,58,0.07)] text-[#96342e] dark:bg-[rgba(232,124,115,0.08)] dark:text-[#d4736a]', maxPenalty: '\u20AC35M' },
  { key: 'high', badgeClass: 'bg-[rgba(161,98,7,0.07)] text-[#8a5508] dark:bg-[rgba(212,160,40,0.08)] dark:text-[#c49425]', maxPenalty: '\u20AC15M' },
  { key: 'limited', badgeClass: 'bg-[rgba(146,129,14,0.07)] text-[#7a6c0c] dark:bg-[rgba(191,168,37,0.08)] dark:text-[#a89523]', maxPenalty: '\u20AC7.5M' },
];

export function PenaltyExposure({ riskDistribution }: PenaltyExposureProps) {
  const t = useTranslations('dashboard');

  const tiers = PENALTY_TIERS
    .map((tier) => ({ ...tier, count: riskDistribution[tier.key] || 0 }))
    .filter((tier) => tier.count > 0);

  return (
    <div className="bg-[var(--card)] border border-[var(--b2)] rounded-xl p-5 transition-all dark:border-[var(--b3)]">
      {/* Header */}
      <div className="font-display text-[0.9375rem] font-bold text-[var(--dark)] mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 stroke-[var(--teal)]" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
        {t('penaltyExposure')}
      </div>

      {tiers.length === 0 ? (
        <p className="text-[var(--dark5)] text-sm">No high-risk or prohibited tools</p>
      ) : (
        <>
          <div className="text-[0.8125rem] text-[var(--dark4)] mb-3">
            Breakdown by risk tier (Art. 99)
          </div>
          <div className="flex flex-col gap-1.5">
            {tiers.map((tier) => (
              <div key={tier.key} className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-[var(--bg2)] text-xs dark:bg-[var(--bg3)]">
                <span className="text-[var(--dark3)] flex items-center gap-1.5">
                  <span className={`font-mono text-[0.4375rem] font-bold uppercase tracking-[0.04em] py-0.5 px-1.5 rounded ${tier.badgeClass}`}>
                    {t(tier.key as 'prohibited' | 'high' | 'limited')}
                  </span>
                  {tier.count} {tier.count === 1 ? 'tool' : 'tools'}
                </span>
                <span className="font-mono font-bold text-[var(--dark)]">up to {tier.maxPenalty}</span>
              </div>
            ))}
          </div>
          <div className="font-mono text-[0.375rem] text-[var(--dark5)] mt-2.5">
            * Max ceiling per tier. Actual fines depend on severity, cooperation, company size (Art. 99(7))
          </div>
        </>
      )}
    </div>
  );
}
