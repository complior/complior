'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/currency';

/* ──── Plan data (prices in EUR cents, from app/config/plans.js) ──── */
const plans = [
  { key: 'free', priceMonthly: 0, priceYearly: 0, ctaStyle: 'outline' as const },
  { key: 'starter', priceMonthly: 4900, priceYearly: 47040, ctaStyle: 'teal' as const },
  { key: 'growth', priceMonthly: 14900, priceYearly: 143040, ctaStyle: 'teal' as const, popular: true },
  { key: 'scale', priceMonthly: 39900, priceYearly: 383040, ctaStyle: 'teal' as const },
  { key: 'enterprise', priceMonthly: -1, priceYearly: -1, ctaStyle: 'outline' as const },
];

/* ──── SVG icons matching the HTML design exactly ──── */
function CheckIcon() {
  return (
    <span className="pricing-ck" style={{
      width: 18, height: 18, borderRadius: '50%', background: 'var(--teal-dim)',
      display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>
      <svg viewBox="0 0 24 24" style={{
        width: 10, height: 10, stroke: 'var(--teal)', fill: 'none',
        strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round',
      }}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function XIcon() {
  return (
    <span className="pricing-xk" style={{
      width: 18, height: 18, display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>
      <svg viewBox="0 0 24 24" style={{
        width: 10, height: 10, stroke: 'var(--dark5)', fill: 'none',
        strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0.4,
      }}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </span>
  );
}

/* ──── Comparison table value types ──── */
type CellValue =
  | { type: 'check' }
  | { type: 'x' }
  | { type: 'text'; key: string }
  | { type: 'limit'; key: string }
  | { type: 'dash' };

/* ──── Comparison table data ──── */
interface CompRow {
  feature: string;
  hint?: string;
  values: [CellValue, CellValue, CellValue, CellValue, CellValue];
}

interface CompGroup {
  title: string;
  rows: CompRow[];
}

function getComparisonData(): CompGroup[] {
  return [
    {
      title: 'compGroupUsage',
      rows: [
        {
          feature: 'compAiTools',
          values: [
            { type: 'text', key: '1' }, { type: 'text', key: '5' },
            { type: 'text', key: '20' }, { type: 'text', key: 'unlimited' },
            { type: 'text', key: 'unlimited' },
          ],
        },
        {
          feature: 'compPlatformUsers',
          values: [
            { type: 'text', key: '1' }, { type: 'text', key: '2' },
            { type: 'text', key: '5' }, { type: 'text', key: 'unlimited' },
            { type: 'text', key: 'unlimited' },
          ],
        },
        {
          feature: 'compEmployees', hint: 'compEmployeesHint',
          values: [
            { type: 'dash' }, { type: 'text', key: '15' },
            { type: 'text', key: '50' }, { type: 'text', key: '250' },
            { type: 'text', key: 'unlimited' },
          ],
        },
        {
          feature: 'compDocExports', hint: 'compDocExportsHint',
          values: [
            { type: 'limit', key: '0' }, { type: 'limit', key: '1' },
            { type: 'text', key: 'unlimited' }, { type: 'text', key: 'unlimited' },
            { type: 'text', key: 'unlimited' },
          ],
        },
        {
          feature: 'compTrialPeriod',
          values: [
            { type: 'dash' }, { type: 'text', key: 'val14days' },
            { type: 'text', key: 'val14days' }, { type: 'text', key: 'val14days' },
            { type: 'dash' },
          ],
        },
      ],
    },
    {
      title: 'compGroupInventory',
      rows: [
        {
          feature: 'compCatalog', hint: 'compCatalogHint',
          values: [
            { type: 'check' }, { type: 'check' }, { type: 'check' },
            { type: 'check' }, { type: 'check' },
          ],
        },
        {
          feature: 'compManualReg',
          values: [
            { type: 'check' }, { type: 'check' }, { type: 'check' },
            { type: 'check' }, { type: 'check' },
          ],
        },
        {
          feature: 'compCsvImport',
          values: [
            { type: 'x' }, { type: 'limit', key: 'valBasic' },
            { type: 'text', key: 'valFull' }, { type: 'text', key: 'valFull' },
            { type: 'text', key: 'valFull' },
          ],
        },
        {
          feature: 'compSelfReg', hint: 'compSelfRegHint',
          values: [
            { type: 'x' }, { type: 'x' }, { type: 'check' },
            { type: 'check' }, { type: 'check' },
          ],
        },
      ],
    },
    {
      title: 'compGroupClassification',
      rows: [
        {
          feature: 'compWizard',
          values: [
            { type: 'check' }, { type: 'text', key: 'valFull' },
            { type: 'text', key: 'valFull' }, { type: 'text', key: 'valFull' },
            { type: 'text', key: 'valFull' },
          ],
        },
        {
          feature: 'compResult', hint: 'compResultHint',
          values: [
            { type: 'check' }, { type: 'check' }, { type: 'check' },
            { type: 'check' }, { type: 'check' },
          ],
        },
        {
          feature: 'compGapAnalysis', hint: 'compGapAnalysisHint',
          values: [
            { type: 'x' }, { type: 'x' }, { type: 'check' },
            { type: 'check' }, { type: 'check' },
          ],
        },
      ],
    },
    {
      title: 'compGroupDocs',
      rows: [
        {
          feature: 'compDocGen', hint: 'compDocGenHint',
          values: [
            { type: 'x' }, { type: 'x' }, { type: 'check' },
            { type: 'check' }, { type: 'check' },
          ],
        },
        {
          feature: 'compBadge', hint: 'compBadgeHint',
          values: [
            { type: 'x' }, { type: 'x' }, { type: 'check' },
            { type: 'check' }, { type: 'text', key: 'valPremium' },
          ],
        },
        {
          feature: 'compAuditTrail', hint: 'compAuditTrailHint',
          values: [
            { type: 'x' }, { type: 'limit', key: 'val90days' },
            { type: 'text', key: 'val1year' }, { type: 'text', key: 'unlimited' },
            { type: 'text', key: 'unlimited' },
          ],
        },
      ],
    },
    {
      title: 'compGroupLiteracy',
      rows: [
        {
          feature: 'compCourses',
          values: [
            { type: 'x' }, { type: 'text', key: 'valEN' },
            { type: 'text', key: 'valENDE' }, { type: 'text', key: 'valAllLangs' },
            { type: 'text', key: 'valAllLangs' },
          ],
        },
        {
          feature: 'compCertificates', hint: 'compCertificatesHint',
          values: [
            { type: 'x' }, { type: 'check' }, { type: 'check' },
            { type: 'check' }, { type: 'check' },
          ],
        },
        {
          feature: 'compTracking', hint: 'compTrackingHint',
          values: [
            { type: 'x' }, { type: 'check' }, { type: 'check' },
            { type: 'check' }, { type: 'check' },
          ],
        },
      ],
    },
    {
      title: 'compGroupEva',
      rows: [
        {
          feature: 'compEvaChat', hint: 'compEvaChatHint',
          values: [
            { type: 'x' }, { type: 'text', key: 'val200mo' },
            { type: 'text', key: 'val1000mo' }, { type: 'text', key: 'unlimited' },
            { type: 'text', key: 'unlimited' },
          ],
        },
      ],
    },
    {
      title: 'compGroupDashboard',
      rows: [
        {
          feature: 'compDashboard',
          values: [
            { type: 'limit', key: 'valBasic' }, { type: 'text', key: 'valFull' },
            { type: 'text', key: 'valFull' }, { type: 'text', key: 'valFull' },
            { type: 'text', key: 'valFull' },
          ],
        },
        {
          feature: 'compReminders', hint: 'compRemindersHint',
          values: [
            { type: 'x' }, { type: 'check' }, { type: 'check' },
            { type: 'check' }, { type: 'check' },
          ],
        },
      ],
    },
    {
      title: 'compGroupIntegrations',
      rows: [
        {
          feature: 'compApi',
          values: [
            { type: 'x' }, { type: 'x' }, { type: 'x' },
            { type: 'check' }, { type: 'check' },
          ],
        },
      ],
    },
    {
      title: 'compGroupSupport',
      rows: [
        {
          feature: 'compSupport',
          values: [
            { type: 'limit', key: 'valEmail' }, { type: 'limit', key: 'valEmail' },
            { type: 'text', key: 'valPriorityEmail' }, { type: 'text', key: 'valPriorityOnboard' },
            { type: 'text', key: 'valDedicated' },
          ],
        },
        {
          feature: 'compHosting', hint: 'compHostingHint',
          values: [
            { type: 'check' }, { type: 'check' }, { type: 'check' },
            { type: 'check' }, { type: 'check' },
          ],
        },
        {
          feature: 'compDpa',
          values: [
            { type: 'check' }, { type: 'check' }, { type: 'check' },
            { type: 'check' }, { type: 'check' },
          ],
        },
      ],
    },
  ];
}

/* ──── Cell renderer ──── */
function CompCell({ cell, t, tc }: { cell: CellValue; t: (k: string) => string; tc: (k: string) => string }) {
  switch (cell.type) {
    case 'check':
      return <CheckIcon />;
    case 'x':
      return <XIcon />;
    case 'dash':
      return (
        <span style={{
          fontFamily: 'var(--f-mono)', fontSize: '0.6875rem', color: 'var(--dark5)',
        }}>&mdash;</span>
      );
    case 'text': {
      // Special case for "unlimited" which uses common translation
      const display = cell.key === 'unlimited'
        ? tc('unlimited')
        : cell.key.startsWith('val') ? t(cell.key) : cell.key;
      return (
        <span style={{
          fontFamily: 'var(--f-mono)', fontSize: '0.6875rem', fontWeight: 600,
          color: 'var(--dark2)',
        }}>{display}</span>
      );
    }
    case 'limit': {
      const display = cell.key.startsWith('val') ? t(cell.key) : cell.key;
      return (
        <span style={{
          fontFamily: 'var(--f-mono)', fontSize: '0.6875rem', color: 'var(--dark5)',
        }}>{display}</span>
      );
    }
  }
}

/* ──── Button styles matching HTML .bt .bt-t and .bt-o ──── */
const btBase: React.CSSProperties = {
  padding: '0.5rem 1.125rem',
  borderRadius: 6,
  fontWeight: 700,
  fontSize: '0.8125rem',
  transition: '0.25s',
  cursor: 'pointer',
  fontFamily: 'var(--f-body)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4375rem',
  lineHeight: 1.4,
  textDecoration: 'none',
  boxSizing: 'border-box' as const,
  border: 'none',
};

const btTeal: React.CSSProperties = {
  ...btBase,
  background: 'var(--teal)',
  color: '#fff',
  boxShadow: '0 2px 8px rgba(13,148,136,.2)',
};

const btOutline: React.CSSProperties = {
  ...btBase,
  background: 'transparent',
  color: 'var(--teal)',
  border: '1.5px solid var(--teal)',
};

/* ================================================================== */
/*  PRICING PAGE                                                       */
/* ================================================================== */
export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const locale = useLocale();
  const t = useTranslations('pricing');
  const tc = useTranslations('common');

  const compData = getComparisonData();

  /* Compute display price (per-month amount in cents) */
  function getDisplayPrice(plan: typeof plans[number]): string {
    if (plan.key === 'enterprise') return tc('custom');
    if (plan.key === 'free') return formatPrice(0, locale);
    const cents = annual ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
    return formatPrice(cents, locale);
  }

  /* CTA href */
  function getCtaHref(plan: typeof plans[number]): string {
    if (plan.key === 'enterprise') return `/${locale}/contact`;
    if (plan.key === 'free') return `/${locale}/auth/register?plan=free`;
    return `/${locale}/auth/register?plan=${plan.key}&period=${annual ? 'annual' : 'monthly'}`;
  }

  /* CTA label */
  function getCtaLabel(plan: typeof plans[number]): string {
    if (plan.key === 'enterprise') return t('contactBtn');
    if (plan.key === 'free') return t('getStartedBtn');
    return t('freeTrialBtn');
  }

  /* Plan name from translations */
  function getPlanName(key: string): string {
    const nameMap: Record<string, string> = {
      free: t('freeName'),
      starter: t('starterName'),
      growth: t('growthName'),
      scale: t('scaleName'),
      enterprise: t('enterpriseName'),
    };
    return nameMap[key] || key;
  }

  return (
    <>
      {/* ──── HERO ──── */}
      <section
        className="pricing-hero"
        style={{ padding: '4rem 0 2rem', textAlign: 'center' }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 2rem' }}>
          <div style={{
            fontFamily: 'var(--f-mono)', fontSize: '0.5625rem', fontWeight: 500,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--teal)', marginBottom: '0.75rem',
          }}>
            {t('heroLabel')}
          </div>
          <h1 style={{
            fontFamily: 'var(--f-display)', fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            fontWeight: 800, color: 'var(--dark)', marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
          }}>
            {t('heroTitle')}
            <em style={{ fontStyle: 'italic', color: 'var(--teal)', fontWeight: 600 }}>
              {t('heroTitleEm')}
            </em>
          </h1>
          <p style={{
            fontSize: '1rem', color: 'var(--dark4)', maxWidth: 480, margin: '0 auto',
          }}>
            {t('heroSubtitle')}
          </p>
        </div>
      </section>

      {/* ──── TOGGLE ──── */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 2rem' }}>
        <div className="pricing-toggle" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.625rem', margin: '2rem 0 2.5rem',
        }}>
          <span
            onClick={() => setAnnual(false)}
            style={{
              fontSize: '0.8125rem',
              color: annual ? 'var(--dark4)' : 'var(--dark)',
              fontWeight: annual ? 500 : 700,
              transition: '0.25s', cursor: 'pointer', userSelect: 'none',
            }}
          >
            {tc('monthly')}
          </span>

          <div
            onClick={() => setAnnual((v) => !v)}
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: annual ? 'var(--teal)' : 'var(--bg3)',
              position: 'relative', cursor: 'pointer', transition: '0.25s',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,.15)',
              position: 'absolute', top: 3, left: annual ? 23 : 3,
              transition: '0.25s',
            }} />
          </div>

          <span
            onClick={() => setAnnual(true)}
            style={{
              fontSize: '0.8125rem',
              color: annual ? 'var(--dark)' : 'var(--dark4)',
              fontWeight: annual ? 700 : 500,
              transition: '0.25s', cursor: 'pointer', userSelect: 'none',
            }}
          >
            {tc('annual')}
          </span>

          <span className="save-tag">{tc('save20')}</span>
        </div>
      </div>

      {/* ──── PLAN ROW (STICKY HEADER) ──── */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 2rem' }}>
        <div className="pricing-plan-row" style={{
          display: 'grid', gridTemplateColumns: '220px repeat(5, 1fr)', gap: 0,
          position: 'sticky', top: 54, zIndex: 50,
          background: 'var(--bg)', borderBottom: '2px solid var(--b2)',
          paddingBottom: '1.25rem', marginBottom: 0,
        }}>
          {/* Empty label column */}
          <div />

          {plans.map((plan) => {
            const isPopular = plan.key === 'growth';
            const isEnterprise = plan.key === 'enterprise';

            return (
              <div
                key={plan.key}
                className={`pricing-plan-cell${isPopular ? ' pricing-plan-pop' : ''}`}
                style={{
                  textAlign: 'center', padding: '0.75rem 0.5rem',
                  position: isPopular ? 'relative' : undefined,
                }}
              >
                {/* Most Popular badge */}
                {isPopular && (
                  <div style={{
                    position: 'absolute', top: '-0.5rem', left: '50%',
                    transform: 'translateX(-50%)',
                    fontFamily: 'var(--f-mono)', fontSize: '0.4375rem', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: 'var(--teal)', background: 'var(--teal-dim)',
                    border: '1px solid var(--teal-glow)',
                    padding: '0.125rem 0.5rem', borderRadius: 8, whiteSpace: 'nowrap',
                  }}>
                    {tc('mostPopular')}
                  </div>
                )}

                <div style={{
                  fontFamily: 'var(--f-display)', fontSize: '1rem', fontWeight: 700,
                  color: 'var(--dark)', marginBottom: '0.125rem',
                }}>
                  {getPlanName(plan.key)}
                </div>

                <div style={{
                  fontFamily: 'var(--f-display)',
                  fontSize: isEnterprise ? '1.375rem' : '1.75rem',
                  fontWeight: 800, color: 'var(--teal)',
                }}>
                  {getDisplayPrice(plan)}
                  {!['free', 'enterprise'].includes(plan.key) && (
                    <small style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--dark5)' }}>
                      {tc('perMonth')}
                    </small>
                  )}
                </div>

                <div style={{
                  fontFamily: 'var(--f-mono)', fontSize: '0.5rem', color: 'var(--dark5)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  marginBottom: '0.625rem',
                }}>
                  {plan.key === 'free'
                    ? tc('forever')
                    : plan.key === 'enterprise'
                      ? tc('tailored')
                      : t('trialPeriod')}
                </div>

                <div>
                  <Link
                    href={getCtaHref(plan)}
                    style={{
                      ...(plan.ctaStyle === 'teal' ? btTeal : btOutline),
                      width: '100%', justifyContent: 'center',
                      padding: '0.4375rem 0.75rem', fontSize: '0.75rem',
                    }}
                  >
                    {getCtaLabel(plan)}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ──── COMPARISON TABLE ──── */}
      <section className="pricing-comp-section" style={{ padding: '0 0 3.5rem' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 2rem' }}>
          {compData.map((group, gi) => (
            <div key={gi} style={{ marginBottom: '0.5rem' }}>
              {/* Group title */}
              <div style={{
                fontFamily: 'var(--f-mono)', fontSize: '0.5625rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'var(--teal)', padding: '0.875rem 0 0.5rem',
                borderBottom: '1px solid var(--b)',
              }}>
                {t(group.title)}
              </div>

              {/* Rows */}
              {group.rows.map((row, ri) => (
                <div
                  key={ri}
                  className="pricing-comp-row"
                  style={{
                    display: 'grid', gridTemplateColumns: '220px repeat(5, 1fr)',
                    gap: 0, borderBottom: '1px solid var(--b)', transition: 'background 0.15s',
                  }}
                >
                  {/* Feature name cell */}
                  <div style={{
                    padding: '0.625rem 0.5rem 0.625rem 0', fontSize: '0.8125rem',
                    color: 'var(--dark2)', fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                  }}>
                    <span>
                      {t(row.feature)}
                      {row.hint && (
                        <span style={{
                          fontSize: '0.625rem', color: 'var(--dark5)', fontWeight: 400,
                          display: 'block', marginTop: '0.125rem',
                        }}>
                          {t(row.hint)}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* 5 value cells */}
                  {row.values.map((cell, ci) => (
                    <div key={ci} style={{
                      padding: '0.625rem 0.5rem', textAlign: 'center',
                      fontSize: '0.8125rem', color: 'var(--dark3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CompCell cell={cell} t={(k: string) => t(k)} tc={(k: string) => tc(k)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ──── CTA BAR ──── */}
      <section style={{
        background: 'var(--bg2)', padding: '3rem 0', textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: 'var(--f-display)', fontSize: '1.5rem', fontWeight: 700,
          color: 'var(--dark)', marginBottom: '0.5rem',
        }}>
          {t('ctaTitle')}
          <em style={{ fontStyle: 'italic', color: 'var(--teal)', fontWeight: 600 }}>
            {t('ctaTitleEm')}
          </em>
          ?
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--dark4)', marginBottom: '1.5rem' }}>
          {t('ctaSubtitle')}
        </p>
        <div style={{
          display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap',
        }}>
          <Link
            href={`/${locale}/auth/register`}
            style={{ ...btTeal, padding: '0.625rem 1.5rem', fontSize: '0.875rem' }}
          >
            {tc('getStarted')}
          </Link>
          <Link
            href={`/${locale}/contact`}
            style={{ ...btOutline, padding: '0.625rem 1.5rem', fontSize: '0.875rem' }}
          >
            {tc('bookDemo')}
          </Link>
        </div>
      </section>

      {/* ──── FAQ ──── */}
      <section style={{ padding: '3.5rem 0' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 2rem' }}>
          <h2 style={{
            fontFamily: 'var(--f-display)', fontSize: '1.5rem', fontWeight: 700,
            color: 'var(--dark)', textAlign: 'center', marginBottom: '2rem',
          }}>
            {t('faqTitle')}
          </h2>
          <div className="pricing-faq-grid" style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem',
            maxWidth: 860, margin: '0 auto',
          }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} style={{
                background: 'var(--card)', border: '1px solid var(--b2)',
                borderRadius: 10, padding: '1.25rem',
              }}>
                <h3 style={{
                  fontFamily: 'var(--f-display)', fontSize: '0.875rem', fontWeight: 700,
                  color: 'var(--dark)', marginBottom: '0.375rem',
                }}>
                  {t(`faq${n}Q`)}
                </h3>
                <p style={{
                  fontSize: '0.8125rem', color: 'var(--dark4)', lineHeight: 1.6,
                  margin: 0,
                }}>
                  {t(`faq${n}A`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── FOOTER (simplified) ──── */}
      <footer style={{
        padding: '2rem 0', borderTop: '1px solid var(--b)', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 2rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--dark5)', margin: 0 }}>
            {t('footerText')} &middot;{' '}
            <Link href={`/${locale}/privacy`} style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
              Privacy
            </Link>{' '}&middot;{' '}
            <Link href={`/${locale}/terms`} style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
              Terms
            </Link>{' '}&middot;{' '}
            <Link href={`/${locale}/dpa`} style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
              DPA
            </Link>{' '}&middot; Made in Germany
          </p>
        </div>
      </footer>

      {/* ──── RESPONSIVE STYLES via style jsx ──── */}
      <style jsx>{`
        .pricing-comp-row:hover {
          background: var(--teal-dim);
        }
        @media (max-width: 1024px) {
          .pricing-plan-row,
          .pricing-comp-row {
            grid-template-columns: 160px repeat(5, 1fr) !important;
          }
        }
        @media (max-width: 860px) {
          .pricing-plan-row,
          .pricing-comp-row {
            grid-template-columns: 140px repeat(5, 130px) !important;
            min-width: 790px;
          }
          .pricing-comp-section {
            overflow-x: auto;
          }
          .pricing-comp-section > div {
            min-width: 790px;
          }
          .pricing-faq-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .pricing-hero {
            padding: 3rem 0 1.5rem !important;
          }
          .pricing-hero h1 {
            font-size: 1.75rem !important;
          }
        }
      `}</style>
    </>
  );
}
