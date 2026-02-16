'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { gsap } from 'gsap';

export function Hero() {
  const locale = useLocale();
  const t = useTranslations('hero');
  const sectionRef = useRef<HTMLElement>(null);
  const dashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const els = sectionRef.current.querySelectorAll('[data-hero-anim]');
    gsap.fromTo(
      els,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out' }
    );

    // Animate dashboard score ring
    const scoreFg = sectionRef.current.querySelector('.sc-fg') as SVGCircleElement | null;
    if (scoreFg) {
      // 87% of 257 circumference = 33.41 offset
      gsap.to(scoreFg, {
        strokeDashoffset: 33.41,
        duration: 2,
        ease: 'power2.out',
        delay: 0.6,
      });
    }

    // Animate stat bars
    const fills = sectionRef.current.querySelectorAll('.ds-fill');
    fills.forEach((fill) => {
      const el = fill as HTMLElement;
      const w = el.style.getPropertyValue('--w');
      gsap.fromTo(el, { width: '0%' }, { width: w, duration: 1.2, ease: 'power2.out', delay: 0.8 });
    });

    // Animate tool cards
    const cards = sectionRef.current.querySelectorAll('.dc');
    gsap.fromTo(
      cards,
      { opacity: 0, y: 4 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.15, delay: 1.8, ease: 'power2.out' }
    );
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden flex items-center"
      style={{ minHeight: '100vh', padding: '6rem 0 3rem' }}
    >
      {/* Hero background radial gradient blob */}
      <div
        className="pointer-events-none absolute z-0"
        style={{
          top: '-20%',
          right: '-10%',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13,148,136,.06) 0%, transparent 70%)',
        }}
      />

      <div className="hero-ctr relative z-[1] mx-auto max-w-ctr px-8 grid items-center gap-14">
        {/* Left: Hero text */}
        <div style={{ maxWidth: 540 }}>
          {/* Badge tag */}
          <div
            data-hero-anim
            className="mb-5 inline-flex items-center gap-2 font-mono"
            style={{
              fontSize: '0.625rem',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              background: 'var(--teal-dim)',
              border: '1px solid rgba(13,148,136,.12)',
              padding: '0.3125rem 0.75rem',
              borderRadius: 100,
            }}
          >
            <span
              className="animate-pulse"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--teal)',
                boxShadow: '0 0 6px var(--teal)',
                flexShrink: 0,
              }}
            />
            {t('tag')}
          </div>

          {/* H1 */}
          <h1
            data-hero-anim
            className="font-display"
            style={{
              fontSize: 'clamp(2.25rem, 4.5vw, 3.375rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              color: 'var(--dark)',
              marginBottom: '1.25rem',
              letterSpacing: '-0.03em',
            }}
          >
            {t('title')}
            <em
              className="relative inline-block"
              style={{ fontStyle: 'italic', color: 'var(--teal)', fontWeight: 600 }}
            >
              {t('titleEm')}
              <span
                style={{
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  bottom: '0.04em',
                  width: '100%',
                  height: 3,
                  background: 'var(--teal)',
                  borderRadius: 2,
                  transform: 'scaleX(0)',
                  transformOrigin: 'left',
                  animation: 'hl 0.8s ease 0.9s forwards',
                }}
              />
            </em>
          </h1>

          {/* Subtitle */}
          <p
            data-hero-anim
            style={{
              fontSize: '1.0625rem',
              color: 'var(--dark4)',
              lineHeight: 1.75,
              marginBottom: '2rem',
            }}
          >
            {t('subtitle')}
          </p>

          {/* CTA buttons */}
          <div
            data-hero-anim
            className="flex flex-wrap"
            style={{ gap: '0.75rem', marginBottom: '2.25rem' }}
          >
            <Link
              href={`/${locale}/auth/register`}
              className="inline-flex items-center font-body"
              style={{
                padding: '0.75rem 1.75rem',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: '0.9375rem',
                background: 'var(--teal)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(13,148,136,.2)',
                gap: '0.4375rem',
                lineHeight: 1.4,
                transition: '0.25s',
              }}
            >
              {t('cta1')}
              <svg
                style={{ width: 14, height: 14, display: 'inline-block', flexShrink: 0 }}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link
              href="#"
              className="inline-flex items-center font-body"
              style={{
                padding: '0.75rem 1.75rem',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: '0.9375rem',
                background: 'var(--card)',
                color: 'var(--dark)',
                border: '1.5px solid var(--b2)',
                boxShadow: '0 1px 3px rgba(0,0,0,.04)',
                gap: '0.4375rem',
                lineHeight: 1.4,
                transition: '0.25s',
              }}
            >
              <svg
                style={{ width: 14, height: 14, display: 'inline-block', flexShrink: 0 }}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {t('cta2')}
            </Link>
          </div>

          {/* Social proof */}
          <div
            data-hero-anim
            className="flex flex-wrap"
            style={{
              gap: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--b)',
            }}
          >
            {/* Proof 1: checkmark + 240+ companies */}
            <div
              className="flex items-center"
              style={{ fontSize: '0.75rem', color: 'var(--dark5)', gap: '0.375rem' }}
            >
              <svg
                style={{ width: 14, height: 14, color: 'var(--teal)', flexShrink: 0 }}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <b style={{ color: 'var(--dark2)', fontWeight: 700 }}>{t('proof1')}</b>
              {t('proof1Label')}
            </div>
            {/* Proof 2: zap + Saves 80k+ */}
            <div
              className="flex items-center"
              style={{ fontSize: '0.75rem', color: 'var(--dark5)', gap: '0.375rem' }}
            >
              <svg
                style={{ width: 14, height: 14, color: 'var(--teal)', flexShrink: 0 }}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {t('proof2Label')} <b style={{ color: 'var(--dark2)', fontWeight: 700 }}>{t('proof2')}</b>
            </div>
            {/* Proof 3: clock + Setup in 1 day */}
            <div
              className="flex items-center"
              style={{ fontSize: '0.75rem', color: 'var(--dark5)', gap: '0.375rem' }}
            >
              <svg
                style={{ width: 14, height: 14, color: 'var(--teal)', flexShrink: 0 }}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {t('proof3Label')} <b style={{ color: 'var(--dark2)', fontWeight: 700 }}>{t('proof3')}</b>
            </div>
          </div>
        </div>

        {/* Right: 3D Dashboard Mock */}
        <div data-hero-anim className="dash-perspective-wrap hidden sm:block" style={{ perspective: 1000 }} ref={dashRef}>
          <div
            className="dash-tilt"
            style={{
              transform: 'rotateY(-6deg) rotateX(3deg)',
              transition: 'transform 0.7s cubic-bezier(.22,1,.36,1)',
              transformStyle: 'preserve-3d',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'rotateY(-1deg) rotateX(1deg)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'rotateY(-6deg) rotateX(3deg)';
            }}
          >
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--b2)',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow:
                  '0 40px 80px rgba(0,0,0,.08), 0 16px 32px rgba(0,0,0,.04), 0 0 0 1px rgba(0,0,0,.02)',
                position: 'relative',
              }}
            >
              {/* Dashboard top bar */}
              <div
                className="flex items-center"
                style={{
                  background: 'var(--bg2)',
                  padding: '0.5rem 0.875rem',
                  gap: '0.375rem',
                  borderBottom: '1px solid var(--b)',
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
                <div
                  className="font-mono"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--dark5)',
                  }}
                >
                  Complior — Live Dashboard
                </div>
                <div
                  className="animate-pulse"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 6px #22c55e',
                    marginLeft: 'auto',
                  }}
                />
              </div>

              {/* Dashboard body */}
              <div style={{ padding: '1.25rem' }}>
                {/* Score ring + Stats row */}
                <div className="flex items-center" style={{ gap: '1rem', marginBottom: '1rem' }}>
                  {/* Score ring */}
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      viewBox="0 0 100 100"
                      style={{ width: 96, height: 96, transform: 'rotate(-90deg)' }}
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="41"
                        fill="none"
                        stroke="var(--bg3)"
                        strokeWidth={7}
                      />
                      <circle
                        className="sc-fg"
                        cx="50"
                        cy="50"
                        r="41"
                        fill="none"
                        stroke="var(--teal)"
                        strokeWidth={7}
                        strokeLinecap="round"
                        strokeDasharray={257}
                        strokeDashoffset={257}
                        style={{ filter: 'drop-shadow(0 0 4px var(--teal-glow))' }}
                      />
                    </svg>
                    <div
                      className="font-display"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: 'var(--dark)',
                      }}
                    >
                      87
                      <small
                        className="font-body"
                        style={{
                          fontSize: '0.5rem',
                          fontWeight: 400,
                          color: 'var(--dark5)',
                          display: 'block',
                          marginTop: '-0.25rem',
                        }}
                      >
                        %
                      </small>
                    </div>
                  </div>

                  {/* Stat bars */}
                  <div className="flex flex-col flex-1" style={{ gap: '0.4375rem' }}>
                    {[
                      { key: 'High Risk', value: '3 / 12', color: 'var(--amber)', fillClass: 'ds-fill-amber', w: '25%' },
                      { key: 'Compliant', value: '7 / 12', color: 'var(--green)', fillClass: 'ds-fill-green', w: '58%' },
                      { key: 'Pending Review', value: '2 / 12', color: 'var(--teal)', fillClass: 'ds-fill-teal', w: '17%' },
                    ].map((stat) => (
                      <div key={stat.key} style={{ fontSize: '0.6875rem' }}>
                        <div className="flex justify-between" style={{ marginBottom: '0.1875rem' }}>
                          <span style={{ color: 'var(--dark4)' }}>{stat.key}</span>
                          <span
                            className="font-mono"
                            style={{ fontWeight: 600, color: stat.color }}
                          >
                            {stat.value}
                          </span>
                        </div>
                        <div
                          style={{
                            height: 3,
                            background: 'var(--bg3)',
                            borderRadius: 2,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            className={`ds-fill`}
                            style={
                              {
                                height: '100%',
                                borderRadius: 2,
                                width: 0,
                                '--w': stat.w,
                                background:
                                  stat.fillClass === 'ds-fill-amber'
                                    ? 'var(--amber)'
                                    : stat.fillClass === 'ds-fill-green'
                                      ? 'var(--green)'
                                      : 'var(--teal)',
                              } as React.CSSProperties
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tool cards grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4375rem' }}>
                  {[
                    {
                      name: 'ChatGPT',
                      sub: 'General Purpose AI · Art. 4',
                      status: 'Done',
                      dotColor: 'var(--green)',
                      textColor: 'var(--green)',
                      icon: (
                        <svg style={{ width: 10, height: 10, color: 'var(--dark5)' }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      ),
                    },
                    {
                      name: 'Copilot',
                      sub: 'General Purpose AI · Art. 4',
                      status: 'Review',
                      dotColor: 'var(--amber)',
                      textColor: 'var(--amber)',
                      icon: (
                        <svg style={{ width: 10, height: 10, color: 'var(--dark5)' }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <polyline points="16 18 22 12 16 6" />
                          <polyline points="8 6 2 12 8 18" />
                        </svg>
                      ),
                    },
                    {
                      name: 'Grammarly',
                      sub: 'Minimal Risk · No action',
                      status: 'Done',
                      dotColor: 'var(--green)',
                      textColor: 'var(--green)',
                      icon: (
                        <svg style={{ width: 10, height: 10, color: 'var(--dark5)' }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      ),
                    },
                    {
                      name: 'Midjourney',
                      sub: 'General Purpose AI · Art. 4',
                      status: 'Action',
                      dotColor: 'var(--coral)',
                      textColor: 'var(--coral)',
                      icon: (
                        <svg style={{ width: 10, height: 10, color: 'var(--dark5)' }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                        </svg>
                      ),
                    },
                  ].map((tool) => (
                    <div
                      key={tool.name}
                      className="dc"
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--b)',
                        borderRadius: 6,
                        padding: '0.5rem 0.625rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: 0,
                        transform: 'translateY(4px)',
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 4,
                          background: 'var(--bg2)',
                          border: '1px solid var(--b)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {tool.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--dark2)' }}>
                          {tool.name}
                        </div>
                        <div
                          className="font-mono"
                          style={{ fontSize: '0.4375rem', color: 'var(--dark5)', marginTop: '0.0625rem' }}
                        >
                          {tool.sub}
                        </div>
                      </div>
                      <div className="flex items-center" style={{ gap: '0.25rem', flexShrink: 0 }}>
                        <div
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: tool.dotColor,
                            boxShadow: `0 0 4px ${tool.dotColor}`,
                          }}
                        />
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '0.375rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            color: tool.textColor,
                          }}
                        >
                          {tool.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dashboard footer */}
              <div
                className="font-mono"
                style={{
                  fontSize: '0.5rem',
                  color: 'var(--dark5)',
                  textAlign: 'right',
                  padding: '0.4375rem 0.875rem',
                  borderTop: '1px solid var(--b)',
                }}
              >
                Last scan: <span style={{ color: 'var(--teal)', fontWeight: 600 }}>2 min ago</span>{' '}
                · Next: <span style={{ color: 'var(--teal)', fontWeight: 600 }}>14:30 UTC</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
