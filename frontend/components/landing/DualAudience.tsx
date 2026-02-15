'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { SectionHeader } from '@/components/ui/SectionHeader';

/* Inline SVG icons matching the HTML sprite */
const IconOk = () => (
  <svg style={{ display: 'inline-block', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }} viewBox="0 0 24 24">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconCheck = () => (
  <svg style={{ display: 'inline-block', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', verticalAlign: 'middle', flexShrink: 0 }} viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconCode = () => (
  <svg style={{ display: 'inline-block', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }} viewBox="0 0 24 24">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const IconArrow = () => (
  <svg style={{ display: 'inline-block', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export function DualAudience() {
  const locale = useLocale();
  const t = useTranslations('dualAudience');

  const deployerFeatures = [t('deployerF1'), t('deployerF2'), t('deployerF3')];
  const providerFeatures = [t('providerF1'), t('providerF2'), t('providerF3')];

  return (
    <section
      style={{ background: 'var(--bg)', padding: '5rem 0', position: 'relative', zIndex: 1 }}
    >
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 2rem' }}>
        <SectionHeader label={t('label')} title={t('title')} titleEm={t('titleEm')} />

        {/* 2-col grid: .dual-grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
          }}
          className="dual-grid-responsive"
        >
          {/* Deployer card */}
          <div
            className="rv"
            style={{
              background: 'var(--card)',
              border: '1.5px solid var(--teal-glow)',
              borderRadius: 12,
              padding: '2rem',
              transition: 'box-shadow .3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--card-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Tag: checkmark + Available Now */}
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: '0.5rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--teal)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <IconOk /> {t('deployerTag')}
            </div>

            {/* Title */}
            <h3
              style={{
                fontFamily: 'var(--f-display)',
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--dark)',
                marginBottom: '0.75rem',
              }}
            >
              {t('deployerTitle')}
            </h3>

            {/* Bullet list */}
            <ul style={{ listStyle: 'none', marginBottom: '1.25rem', padding: 0 }}>
              {deployerFeatures.map((f, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--dark3)',
                    padding: '0.25rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ color: 'var(--teal)' }}><IconCheck /></span>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA button: teal, large */}
            <Link
              href={`/${locale}/auth/register`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4375rem',
                padding: '0.625rem 1.375rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                fontFamily: 'var(--f-body)',
                borderRadius: 6,
                background: 'var(--teal)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(13,148,136,.2)',
                border: 'none',
                textDecoration: 'none',
                transition: 'background .25s, box-shadow .25s, transform .25s',
                lineHeight: 1.4,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = 'var(--teal2)';
                el.style.boxShadow = '0 4px 16px rgba(13,148,136,.25)';
                el.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = 'var(--teal)';
                el.style.boxShadow = '0 2px 8px rgba(13,148,136,.2)';
                el.style.transform = 'translateY(0)';
              }}
            >
              {t('deployerCta')} <IconArrow />
            </Link>
          </div>

          {/* Provider card */}
          <div
            className="rv rv-d1"
            style={{
              background: 'var(--card)',
              border: '1.5px solid var(--b2)',
              borderRadius: 12,
              padding: '2rem',
              transition: 'box-shadow .3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--card-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Tag: code icon + For AI Providers + Coming Soon badge */}
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: '0.5rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--teal)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <IconCode /> {t('providerTag')}{' '}
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '0.4375rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '0.1875rem 0.5rem',
                  borderRadius: 10,
                  background: 'var(--bg3)',
                  color: 'var(--dark4)',
                  display: 'inline-block',
                  marginLeft: '0.375rem',
                }}
              >
                {t('providerSoon')}
              </span>
            </div>

            {/* Title */}
            <h3
              style={{
                fontFamily: 'var(--f-display)',
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--dark)',
                marginBottom: '0.75rem',
              }}
            >
              {t('providerTitle')}
            </h3>

            {/* Bullet list */}
            <ul style={{ listStyle: 'none', marginBottom: '1.25rem', padding: 0 }}>
              {providerFeatures.map((f, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--dark3)',
                    padding: '0.25rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ color: 'var(--teal)' }}><IconCheck /></span>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA button: outline, large */}
            <Link
              href="#"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4375rem',
                padding: '0.625rem 1.375rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                fontFamily: 'var(--f-body)',
                borderRadius: 6,
                background: 'transparent',
                color: 'var(--teal)',
                border: '1.5px solid var(--teal)',
                textDecoration: 'none',
                transition: 'background .25s',
                lineHeight: 1.4,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--teal-dim)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {t('providerCta')} <IconArrow />
            </Link>
          </div>
        </div>
      </div>

      {/* Responsive grid styles */}
      <style>{`
        @media (max-width: 1024px) {
          .dual-grid-responsive { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .dual-grid-responsive { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
