'use client';

import { useTranslations } from 'next-intl';

/* Inline SVG icons matching the HTML sprite exactly (16x16 for trust badges) */
const IconShield = () => (
  <svg style={{ display: 'inline-block', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const IconCheck = () => (
  <svg style={{ display: 'inline-block', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconLock = () => (
  <svg style={{ display: 'inline-block', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconServer = () => (
  <svg style={{ display: 'inline-block', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="8" rx="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" />
    <circle cx="6" cy="6" r="1" fill="currentColor" />
    <circle cx="6" cy="18" r="1" fill="currentColor" />
  </svg>
);

const IconMap = () => (
  <svg style={{ display: 'inline-block', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconFlag = () => (
  <svg style={{ display: 'inline-block', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

export function TrustBadges() {
  const t = useTranslations('trust');

  const badges = [
    { label: t('gdpr'), icon: <IconShield /> },
    { label: t('iso'), icon: <IconCheck /> },
    { label: t('soc2'), icon: <IconLock /> },
    { label: t('euHosting'), icon: <IconServer /> },
    { label: t('germanUi'), icon: <IconMap /> },
    { label: t('euSupport'), icon: <IconFlag /> },
  ];

  const infra = [
    { flag: '\u{1F1E9}\u{1F1EA}', name: t('hetzner'), role: t('hetznerRole') },
    { flag: '\u{1F1EB}\u{1F1F7}', name: t('mistral'), role: t('mistralRole') },
    { flag: '\u{1F1EB}\u{1F1F7}', name: t('brevo'), role: t('brevoRole') },
    { flag: '\u{1F1EA}\u{1F1EA}', name: t('plausible'), role: t('plausibleRole') },
    { flag: '\u{1F1E9}\u{1F1EA}', name: t('ory'), role: t('oryRole') },
    { flag: '\u{1F1F1}\u{1F1F9}', name: t('betterUptime'), role: t('betterUptimeRole') },
  ];

  return (
    <section
      style={{ background: 'var(--bg)', padding: '5rem 0', position: 'relative', zIndex: 1 }}
    >
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 2rem' }}>
        {/* Section header: no label, just h2 with EU flag emoji */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2
            style={{
              fontFamily: 'var(--f-display)',
              fontSize: 'clamp(1.625rem, 3vw, 2.375rem)',
              fontWeight: 700,
              color: 'var(--dark)',
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em',
            }}
          >
            {'\u{1F1EA}\u{1F1FA}'} {t('title')}
            <em style={{ fontStyle: 'italic', color: 'var(--teal)', fontWeight: 600 }}>
              {t('titleEm')}
            </em>
          </h2>
        </div>

        {/* 6 trust badges in a 6-col grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '1.25rem',
            textAlign: 'center',
          }}
          className="trust-grid-responsive"
        >
          {badges.map((badge, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4375rem',
              }}
            >
              {/* Icon box: 36x36, teal-dim bg, teal border, rounded-lg */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: 'var(--teal-dim)',
                  border: '1px solid rgba(13,148,136,.12)',
                  borderRadius: 8,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--teal)',
                }}
              >
                {badge.icon}
              </div>
              {/* Label: bold, dark3, .625rem */}
              <div
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: 'var(--dark3)',
                }}
              >
                {badge.label}
              </div>
            </div>
          ))}
        </div>

        {/* Data location text */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '1rem',
            fontSize: '0.625rem',
            color: 'var(--dark5)',
            fontFamily: 'var(--f-mono)',
          }}
        >
          {t('dataNote')}
        </p>

        {/* EU infrastructure section */}
        <div style={{ textAlign: 'center' }}>
          {/* Label: mono, teal */}
          <div
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: '0.5625rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              marginBottom: '1.25rem',
              marginTop: '2.5rem',
            }}
          >
            {t('infraLabel')}
          </div>

          {/* 6 providers in flex row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '2rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem',
            }}
          >
            {infra.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                {/* Flag emoji */}
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.flag}</span>
                {/* Name: mono bold */}
                <span
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: 'var(--dark2)',
                  }}
                >
                  {item.name}
                </span>
                {/* Role label */}
                <span
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: '0.5rem',
                    color: 'var(--dark5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {item.role}
                </span>
              </div>
            ))}
          </div>

          {/* Claim: display font, teal, bold on "never" */}
          <p
            style={{
              fontFamily: 'var(--f-display)',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--teal)',
              letterSpacing: '-0.01em',
            }}
          >
            {t('dataClaim').split('never').map((part, i, arr) =>
              i < arr.length - 1 ? (
                <span key={i}>{part}<strong style={{ fontWeight: 800 }}>never</strong></span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>
        </div>
      </div>

      {/* Responsive grid styles */}
      <style>{`
        @media (max-width: 1024px) {
          .trust-grid-responsive { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .trust-grid-responsive { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
