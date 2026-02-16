'use client';

import { useTranslations } from 'next-intl';

/* SVG icon components matching the HTML sprite */
function IconGrid() {
  return (
    <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function IconBot() {
  return (
    <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <circle cx="8" cy="16" r="1" />
      <circle cx="16" cy="16" r="1" />
    </svg>
  );
}

function IconScan() {
  return (
    <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg style={{ width: 10, height: 10 }} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="text-[var(--green)]">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function Capabilities() {
  const t = useTranslations('capabilities');

  const cards = [
    {
      num: '01',
      type: 'core' as const,
      icon: <IconGrid />,
      titleKey: 'cap1Title' as const,
      descKey: 'cap1Desc' as const,
      features: ['cap1f1' as const, 'cap1f2' as const, 'cap1f3' as const],
      badgeKey: 'badgeCore' as const,
    },
    {
      num: '02',
      type: 'ai' as const,
      icon: <IconBot />,
      titleKey: 'cap2Title' as const,
      descKey: 'cap2Desc' as const,
      features: [],
      badgeKey: 'badgeAi' as const,
      eva: { qKey: 'cap2Q' as const, aKey: 'cap2A' as const },
    },
    {
      num: '03',
      type: 'ai' as const,
      icon: <IconScan />,
      titleKey: 'cap3Title' as const,
      descKey: 'cap3Desc' as const,
      features: ['cap3f1' as const, 'cap3f2' as const, 'cap3f3' as const],
      badgeKey: 'badgeAi' as const,
      scanBar: true,
    },
    {
      num: '04',
      type: 'core' as const,
      icon: <IconFile />,
      titleKey: 'cap4Title' as const,
      descKey: 'cap4Desc' as const,
      features: ['cap4f1' as const, 'cap4f2' as const, 'cap4f3' as const],
      badgeKey: 'badgeCore' as const,
    },
  ];

  return (
    <section
      id="caps"
      style={{ padding: '5rem 0', background: 'var(--bg)', position: 'relative', zIndex: 1 }}
    >
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
          </h2>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--dark4)',
              maxWidth: 500,
              margin: '0 auto',
              lineHeight: 1.65,
            }}
          >
            {t('subtitle')}
          </p>
        </div>

        {/* Capability cards: 2-col grid */}
        <div className="landing-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {cards.map((card) => {
            const isAi = card.type === 'ai';
            const purple = '#9333ea';

            return (
              <div
                key={card.num}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--b2)',
                  borderRadius: 10,
                  padding: '2rem',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: '0.3s',
                }}
                className="hover:shadow-[0_8px_24px_rgba(0,0,0,.06)] hover:-translate-y-0.5"
              >
                {/* Watermark number */}
                <div
                  className="font-display"
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    color: 'var(--teal)',
                    opacity: 0.07,
                    position: 'absolute',
                    top: '0.5rem',
                    right: '1rem',
                    lineHeight: 1,
                  }}
                >
                  {card.num}
                </div>

                {/* Icon */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: '1rem',
                    ...(isAi
                      ? {
                          background: 'rgba(147,51,234,.06)',
                          border: '1px solid rgba(147,51,234,.1)',
                          color: purple,
                        }
                      : {
                          background: 'var(--teal-dim)',
                          border: '1px solid rgba(13,148,136,.12)',
                          color: 'var(--teal)',
                        }),
                  }}
                >
                  {card.icon}
                </div>

                {/* Title */}
                <h3
                  className="font-display"
                  style={{
                    fontSize: '1.0625rem',
                    fontWeight: 700,
                    color: 'var(--dark)',
                    marginBottom: '0.4375rem',
                  }}
                >
                  {t(card.titleKey)}
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
                  {t(card.descKey)}
                </p>

                {/* Feature list (for cards with features) */}
                {card.features.length > 0 && (
                  <ul
                    style={{
                      listStyle: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3125rem',
                      marginBottom: '1rem',
                    }}
                  >
                    {card.features.map((fKey) => (
                      <li
                        key={fKey}
                        className="font-mono"
                        style={{
                          fontSize: '0.6875rem',
                          color: 'var(--dark4)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4375rem',
                        }}
                      >
                        <IconCheck />
                        {t(fKey)}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Eva demo box (card 2 only) */}
                {card.eva && (
                  <div
                    className="font-mono"
                    style={{
                      background: 'var(--bg2)',
                      border: '1px solid var(--b2)',
                      borderRadius: 8,
                      padding: '1rem 1.125rem',
                      marginTop: '0.875rem',
                      fontSize: '0.6875rem',
                      color: 'var(--dark4)',
                      lineHeight: 1.8,
                    }}
                  >
                    <div
                      style={{
                        color: 'var(--teal)',
                        fontWeight: 500,
                        marginBottom: '0.375rem',
                      }}
                    >
                      {t(card.eva.qKey)}
                    </div>
                    <div>
                      {(() => {
                        const answer = t(card.eva!.aKey);
                        const boldPhrase = 'not high-risk';
                        const idx = answer.indexOf(boldPhrase);
                        if (idx === -1) return <>{answer}</>;
                        return (
                          <>
                            {answer.slice(0, idx)}
                            <strong style={{ color: 'var(--dark2)' }}>{boldPhrase}</strong>
                            {answer.slice(idx + boldPhrase.length)}
                          </>
                        );
                      })()}
                      <span
                        className="animate-blink"
                        style={{
                          display: 'inline-block',
                          width: 1,
                          height: '0.75em',
                          background: 'var(--teal)',
                          marginLeft: 2,
                          verticalAlign: 'text-bottom',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Scan bar animation (card 3 only) */}
                {card.scanBar && (
                  <div
                    style={{
                      height: 2,
                      background: 'var(--bg3)',
                      borderRadius: 1,
                      marginTop: '0.875rem',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="animate-scanmove"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '30%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, var(--teal), transparent)',
                        borderRadius: 1,
                      }}
                    />
                  </div>
                )}

                {/* Badge */}
                <div style={{ marginTop: card.eva ? '0.875rem' : card.scanBar ? '0.75rem' : 0 }}>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '0.5rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '0.1875rem 0.4375rem',
                      borderRadius: 100,
                      ...(isAi
                        ? {
                            background: 'rgba(147,51,234,.06)',
                            color: purple,
                            border: '1px solid rgba(147,51,234,.1)',
                          }
                        : {
                            background: 'var(--teal-dim)',
                            color: 'var(--teal)',
                            border: '1px solid rgba(13,148,136,.12)',
                          }),
                    }}
                  >
                    {t(card.badgeKey)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
