'use client';

import { useTranslations } from 'next-intl';

/* SVG icon components matching the HTML sprite */
function IconBan() {
  return (
    <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="text-[var(--coral)]">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="text-[var(--coral)]">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconDollar() {
  return (
    <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="text-[var(--coral)]">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="text-[var(--coral)]">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="text-[var(--amber)]">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export function PainCards() {
  const t = useTranslations('pain');

  const cards = [
    { icon: <IconBan />, titleKey: 'card1Title' as const, descKey: 'card1Desc' as const },
    { icon: <IconAlert />, titleKey: 'card2Title' as const, descKey: 'card2Desc' as const },
    { icon: <IconDollar />, titleKey: 'card3Title' as const, descKey: 'card3Desc' as const },
    { icon: <IconClock />, titleKey: 'card4Title' as const, descKey: 'card4Desc' as const },
  ];

  return (
    <section style={{ padding: '5rem 0', background: 'var(--bg2)', position: 'relative', zIndex: 1 }}>
      <div className="mx-auto max-w-ctr px-8">
        {/* Section header */}
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

        {/* Pain cards grid: 2 columns */}
        <div className="landing-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {cards.map((card, i) => (
            <div
              key={i}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--b2)',
                borderRadius: 10,
                padding: '1.75rem',
                textAlign: 'left',
                transition: '0.3s',
                position: 'relative',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
              }}
              className="hover:shadow-[0_8px_24px_rgba(0,0,0,.06)] hover:-translate-y-0.5"
            >
              {/* Icon box */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 8,
                  background: 'var(--coral-dim)',
                  border: '1px solid rgba(231,76,60,.1)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {card.icon}
              </div>
              {/* Text content */}
              <div>
                <h3
                  className="font-display"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: 'var(--dark)',
                    marginBottom: '0.375rem',
                  }}
                >
                  {t(card.titleKey)}
                </h3>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--dark4)',
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                  }}
                >
                  {t(card.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Callout box */}
        <div
          style={{
            background: 'rgba(217,119,6,.04)',
            border: '1px solid rgba(217,119,6,.15)',
            padding: '0.875rem 1rem',
            marginTop: '1.5rem',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.625rem',
            fontSize: '0.8125rem',
            lineHeight: 1.6,
            color: 'var(--dark2)',
          }}
        >
          <IconInfo />
          <p style={{ margin: 0 }}>
            {t.rich('callout', {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </div>
      </div>
    </section>
  );
}
