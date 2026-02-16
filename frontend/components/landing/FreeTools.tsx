'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { SectionHeader } from '@/components/ui/SectionHeader';

/* Inline SVG icons matching the HTML sprite exactly */
const IconZap = () => (
  <svg style={{ display: 'inline-block', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconDollar = () => (
  <svg style={{ display: 'inline-block', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const IconShield = () => (
  <svg style={{ display: 'inline-block', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export function FreeTools() {
  const locale = useLocale();
  const t = useTranslations('freeTools');

  const tools = [
    {
      badge: t('tool1Badge'),
      title: t('tool1Title'),
      desc: t('tool1Desc'),
      cta: t('tool1Cta'),
      href: `/${locale}/check`,
      icon: <IconZap />,
      delay: '',
    },
    {
      badge: t('tool2Badge'),
      title: t('tool2Title'),
      desc: t('tool2Desc'),
      cta: t('tool2Cta'),
      href: `/${locale}/penalty-calculator`,
      icon: <IconDollar />,
      delay: 'rv-d1',
    },
    {
      badge: t('tool3Badge'),
      title: t('tool3Title'),
      desc: t('tool3Desc'),
      cta: t('tool3Cta'),
      href: `/${locale}/auth/register`,
      icon: <IconShield />,
      delay: 'rv-d2',
    },
  ];

  return (
    <section
      id="free-tools"
      style={{ background: 'var(--bg2)', padding: '5rem 0', position: 'relative', zIndex: 1 }}
    >
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 2rem' }}>
        <SectionHeader label={t('label')} title={t('title')} titleEm={t('titleEm')} subtitle={t('subtitle')} />

        {/* 3-col grid: .ftool-grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.25rem',
          }}
          className="ftool-grid-responsive"
        >
          {tools.map((tool, i) => (
            <div
              key={i}
              className={`rv ${tool.delay}`}
              style={{
                background: 'var(--card)',
                border: '1.5px solid var(--b2)',
                borderRadius: 12,
                padding: '1.75rem',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color .3s, box-shadow .3s, transform .3s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = 'var(--teal)';
                el.style.boxShadow = 'var(--card-hover)';
                el.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = 'var(--b2)';
                el.style.boxShadow = 'none';
                el.style.transform = 'translateY(0)';
              }}
            >
              {/* Badge: absolute top-right */}
              <div
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  fontFamily: 'var(--f-mono)',
                  fontSize: '0.4375rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '0.1875rem 0.5rem',
                  borderRadius: 10,
                  background: 'var(--teal-dim)',
                  color: 'var(--teal)',
                  border: '1px solid var(--teal-glow)',
                }}
              >
                {tool.badge}
              </div>

              {/* Icon box: 40x40 */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'var(--teal-dim)',
                  border: '1px solid var(--teal-glow)',
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: '1rem',
                  color: 'var(--teal)',
                }}
              >
                {tool.icon}
              </div>

              {/* Title */}
              <h3
                style={{
                  fontFamily: 'var(--f-display)',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  color: 'var(--dark)',
                  marginBottom: '0.5rem',
                }}
              >
                {tool.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--dark4)',
                  lineHeight: 1.6,
                  marginBottom: '1rem',
                }}
              >
                {tool.desc}
              </p>

              {/* CTA link */}
              <Link
                href={tool.href}
                style={{
                  fontFamily: 'var(--f-body)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'var(--teal)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'gap .2s',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.gap = '0.5rem';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.gap = '0.25rem';
                }}
              >
                {tool.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Responsive grid styles */}
      <style>{`
        @media (max-width: 1024px) {
          .ftool-grid-responsive { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .ftool-grid-responsive { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
