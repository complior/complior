'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/currency';

/* Check icon matching the HTML sprite (12x12, teal) */
function CheckIcon() {
  return (
    <svg
      className="text-teal"
      style={{ width: 12, height: 12, flexShrink: 0 }}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* Plan data sourced from app/config/plans.js (prices in EUR cents) */
const plans = [
  {
    name: 'free' as const,
    priceMonthly: 0,
    priceYearly: 0,
    features: ['freeF1', 'freeF2', 'freeF3'] as const,
    ctaStyle: 'outline' as const,
  },
  {
    name: 'starter' as const,
    priceMonthly: 4900,
    priceYearly: 47040,
    features: ['starterF1', 'starterF2', 'starterF3'] as const,
    ctaStyle: 'teal' as const,
  },
  {
    name: 'growth' as const,
    priceMonthly: 14900,
    priceYearly: 143040,
    features: ['growthF1', 'growthF2', 'growthF3'] as const,
    ctaStyle: 'teal' as const,
    popular: true,
  },
  {
    name: 'scale' as const,
    priceMonthly: 39900,
    priceYearly: 383040,
    features: ['scaleF1', 'scaleF2', 'scaleF3'] as const,
    ctaStyle: 'teal' as const,
  },
  {
    name: 'enterprise' as const,
    priceMonthly: -1,
    priceYearly: -1,
    features: ['enterpriseF1', 'enterpriseF2', 'enterpriseF3'] as const,
    ctaStyle: 'outline' as const,
  },
];

export function InlinePricing() {
  const locale = useLocale();
  const t = useTranslations('inlinePricing');
  const tc = useTranslations('common');
  const tp = useTranslations('pricing');
  const [annual, setAnnual] = useState(false);

  return (
    <div
      style={{
        padding: '5rem 0',
        background: 'var(--bg2)',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div className="mx-auto max-w-ctr px-8">
        {/* Section header (sh) */}
        <div className="text-center" style={{ marginBottom: '3rem' }}>
          <div
            className="font-mono"
            style={{
              fontSize: '0.5625rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              marginBottom: '0.75rem',
            }}
          >
            {t('label')}
          </div>
          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(1.625rem, 3vw, 2.375rem)',
              fontWeight: 700,
              color: 'var(--dark)',
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em',
            }}
          >
            {t('title')}
            <em style={{ fontStyle: 'italic', color: 'var(--teal)', fontWeight: 600 }}>
              {t('titleEm')}
            </em>
            {t('titleEnd')}
          </h2>
        </div>

        {/* Price toggle: Monthly / pill / Annual + Save 20% */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.625rem',
            marginBottom: '2rem',
          }}
        >
          {/* Monthly label */}
          <span
            onClick={() => setAnnual(false)}
            style={{
              fontSize: '0.8125rem',
              color: annual ? 'var(--dark4)' : 'var(--dark)',
              fontWeight: annual ? 500 : 700,
              transition: 'color 0.25s',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {tc('monthly')}
          </span>

          {/* Toggle pill: 44x24, bg3, 18px white dot */}
          <div
            onClick={() => setAnnual((v) => !v)}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: annual ? 'var(--teal)' : 'var(--bg3)',
              position: 'relative',
              cursor: 'pointer',
              transition: '0.25s',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,.15)',
                position: 'absolute',
                top: 3,
                left: annual ? 23 : 3,
                transition: '0.25s',
              }}
            />
          </div>

          {/* Annual label */}
          <span
            onClick={() => setAnnual(true)}
            style={{
              fontSize: '0.8125rem',
              color: annual ? 'var(--dark)' : 'var(--dark4)',
              fontWeight: annual ? 700 : 500,
              transition: 'color 0.25s',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {tc('annual')}
          </span>

          {/* Save 20% tag — .save-tag (class from globals.css, same as HTML design) */}
          <span className="save-tag">{tc('save20')}</span>
        </div>

        {/* 5-col pricing card grid (prg prg-5) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '1rem',
          }}
          className="max-[640px]:!grid-cols-1 max-[640px]:!max-w-[360px] max-[640px]:mx-auto"
        >
          {plans.map((plan, i) => {
            const isEnterprise = plan.name === 'enterprise';
            const isFree = plan.name === 'free';
            const isPopular = 'popular' in plan && plan.popular;

            // Compute displayed price (per-month amount in cents)
            let displayCents = 0;
            if (!isEnterprise && !isFree) {
              displayCents = annual
                ? Math.round(plan.priceYearly / 12)
                : plan.priceMonthly;
            }

            return (
              <div
                key={plan.name}
                className={`rv rv-d${i + 1}`}
                style={{
                  background: 'var(--card)',
                  border: isPopular
                    ? '1px solid var(--teal)'
                    : '1px solid var(--b2)',
                  borderRadius: 10,
                  padding: isPopular ? '2rem 1.75rem' : '1.75rem',
                  position: 'relative',
                  transition: '0.3s',
                  display: 'flex',
                  flexDirection: 'column',
                  ...(isPopular
                    ? {
                        boxShadow:
                          '0 0 0 1px var(--teal), 0 12px 32px rgba(13,148,136,.08)',
                        transform: 'translateY(-6px)',
                      }
                    : {}),
                }}
              >
                {/* Popular: 3px teal top bar */}
                {isPopular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: 'var(--teal)',
                      borderRadius: '10px 10px 0 0',
                    }}
                  />
                )}

                {/* Popular badge floating above card */}
                {isPopular && (
                  <div
                    className="font-mono"
                    style={{
                      position: 'absolute',
                      top: -10,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--teal)',
                      color: '#fff',
                      padding: '0.1875rem 0.75rem',
                      borderRadius: 100,
                      fontSize: '0.5rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tc('mostPopular')}
                  </div>
                )}

                {/* Plan name (pr-n): mono, uppercase, tiny, dark5 */}
                <div
                  className="font-mono"
                  style={{
                    fontSize: '0.5rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--dark5)',
                    marginBottom: '0.75rem',
                  }}
                >
                  {tp(`${plan.name}Name` as 'freeName' | 'starterName' | 'growthName' | 'scaleName' | 'enterpriseName')}
                </div>

                {/* Price (pr-p): display font, 2.25rem, bold */}
                <div
                  className="font-display"
                  style={{
                    fontSize: isEnterprise ? '1.5rem' : '2.25rem',
                    fontWeight: 800,
                    color: 'var(--dark)',
                  }}
                >
                  {isEnterprise
                    ? tc('custom')
                    : isFree
                      ? formatPrice(0, locale)
                      : formatPrice(displayCents, locale)}
                </div>

                {/* Period text (pr-per) */}
                <div
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--dark5)',
                    marginBottom: '1.125rem',
                  }}
                >
                  {isEnterprise
                    ? tc('tailored')
                    : isFree
                      ? tc('forever')
                      : `/${tc('month')}`}
                </div>

                {/* Feature list (pr-ul) with check icons */}
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                    flex: 1,
                  }}
                >
                  {plan.features.map((fKey) => (
                    <li
                      key={fKey}
                      style={{
                        fontSize: '0.6875rem',
                        color: 'var(--dark3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4375rem',
                      }}
                    >
                      <CheckIcon />
                      {t(fKey)}
                    </li>
                  ))}
                </ul>

                {/* CTA button (full width) */}
                {isEnterprise ? (
                  <Link
                    href={`/${locale}/contact`}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1.125rem',
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      transition: '0.25s',
                      cursor: 'pointer',
                      fontFamily: 'var(--f-body)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1.4,
                      textDecoration: 'none',
                      background: 'transparent',
                      color: 'var(--teal)',
                      border: '1.5px solid var(--teal)',
                      boxSizing: 'border-box',
                    }}
                  >
                    {tp('contactBtn')}
                  </Link>
                ) : (
                  <Link
                    href={
                      isFree
                        ? `/${locale}/auth/register?plan=free`
                        : `/${locale}/auth/register?plan=${plan.name}&period=${annual ? 'annual' : 'monthly'}`
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem 1.125rem',
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      transition: '0.25s',
                      cursor: 'pointer',
                      fontFamily: 'var(--f-body)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1.4,
                      textDecoration: 'none',
                      boxSizing: 'border-box',
                      ...(plan.ctaStyle === 'teal'
                        ? {
                            background: 'var(--teal)',
                            color: '#fff',
                            border: 'none',
                            boxShadow: '0 2px 8px rgba(13,148,136,.2)',
                          }
                        : {
                            background: 'transparent',
                            color: 'var(--teal)',
                            border: '1.5px solid var(--teal)',
                          }),
                    }}
                  >
                    {isFree ? tp('getStartedBtn') : tp('freeTrialBtn')}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Full plan comparison link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link
            href={`/${locale}/pricing`}
            style={{
              fontSize: '0.8125rem',
              color: 'var(--teal)',
              fontWeight: 600,
              textDecoration: 'none',
              transition: '0.2s',
            }}
            className="hover:underline"
          >
            {t('fullComparison')}
          </Link>
        </div>
      </div>
    </div>
  );
}
