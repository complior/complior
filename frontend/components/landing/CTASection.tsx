'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

/* Inline SVG icons matching the HTML sprite */
const IconArrow = () => (
  <svg style={{ display: 'inline-block', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconCheck = () => (
  <svg style={{ display: 'inline-block', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function CTASection() {
  const locale = useLocale();
  const t = useTranslations('cta');

  const proofs = [t('proof1'), t('proof2'), t('proof3')];

  return (
    <section
      className="cta-section"
      style={{
        background: 'var(--cta-bg)',
        textAlign: 'center',
        padding: '5rem 2rem',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Radial gradient overlay (::before pseudo-element replicated) */}
      <div
        style={{
          position: 'absolute',
          top: '-25%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,.06), transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 1140, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* h2: display font, white, italic teal em */}
        <h2
          style={{
            fontFamily: 'var(--f-display)',
            fontSize: 'clamp(1.5rem, 3vw, 2.125rem)',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
          }}
        >
          {t('title')}
          <em
            style={{
              fontStyle: 'italic',
              fontFamily: 'var(--f-display)',
              fontWeight: 600,
            }}
          >
            {t('titleEm')}
          </em>
        </h2>

        {/* p: white 70% opacity, max-width 480px */}
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'rgba(255,255,255,.7)',
            marginBottom: '2rem',
            maxWidth: 480,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {t('subtitle')}
        </p>

        {/* 2 buttons */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '1.5rem',
          }}
          className="cta-btns-responsive"
        >
          {/* Start Free Trial: white bg, teal text (bt-cw bt-xl) */}
          <Link
            href={`/${locale}/auth/register`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4375rem',
              padding: '0.75rem 1.75rem',
              fontSize: '0.9375rem',
              fontWeight: 700,
              fontFamily: 'var(--f-body)',
              borderRadius: 6,
              background: 'var(--card)',
              color: 'var(--teal3)',
              boxShadow: '0 2px 8px rgba(0,0,0,.1)',
              border: 'none',
              textDecoration: 'none',
              transition: 'transform .25s, box-shadow .25s',
              lineHeight: 1.4,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'translateY(-1px)';
              el.style.boxShadow = '0 4px 16px rgba(0,0,0,.15)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = '0 2px 8px rgba(0,0,0,.1)';
            }}
          >
            {t('cta1')} <IconArrow />
          </Link>

          {/* Book a Demo: outline, white border/text (bt-co bt-xl) */}
          <Link
            href="#"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4375rem',
              padding: '0.75rem 1.75rem',
              fontSize: '0.9375rem',
              fontWeight: 700,
              fontFamily: 'var(--f-body)',
              borderRadius: 6,
              background: 'transparent',
              color: '#fff',
              border: '1.5px solid rgba(255,255,255,.3)',
              textDecoration: 'none',
              transition: 'border-color .25s, background .25s',
              lineHeight: 1.4,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = '#fff';
              el.style.background = 'rgba(255,255,255,.05)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(255,255,255,.3)';
              el.style.background = 'transparent';
            }}
          >
            {t('cta2')}
          </Link>
        </div>

        {/* Social proof list: 3 items with check icons */}
        <ul
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap',
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
          className="cta-proof-responsive"
        >
          {proofs.map((proof, i) => (
            <li
              key={i}
              style={{
                fontSize: '0.6875rem',
                color: 'rgba(255,255,255,.6)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,.5)' }}>
                <IconCheck />
              </span>
              {proof}
            </li>
          ))}
        </ul>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .cta-btns-responsive a { width: 100%; justify-content: center; }
          .cta-proof-responsive { flex-direction: column !important; align-items: center !important; gap: 0.5rem !important; }
        }
      `}</style>
    </section>
  );
}
