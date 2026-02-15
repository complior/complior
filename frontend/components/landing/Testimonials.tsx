'use client';

import { useTranslations } from 'next-intl';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CounterAnimation } from '@/components/landing/CounterAnimation';

function StarIcon() {
  return (
    <svg
      className="inline-block flex-shrink-0"
      style={{ width: '11px', height: '11px', fill: 'var(--teal)', stroke: 'none' }}
      viewBox="0 0 24 24"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function FiveStars() {
  return (
    <div className="flex" style={{ gap: '2px', marginBottom: '0.5rem' }}>
      <StarIcon />
      <StarIcon />
      <StarIcon />
      <StarIcon />
      <StarIcon />
    </div>
  );
}

export function Testimonials() {
  const t = useTranslations('testimonials');

  const testimonials = [
    { quote: t('t1Quote'), name: t('t1Name'), role: t('t1Role'), initials: 'SK' },
    { quote: t('t2Quote'), name: t('t2Name'), role: t('t2Role'), initials: 'MT' },
    { quote: t('t3Quote'), name: t('t3Name'), role: t('t3Role'), initials: 'DL' },
  ];

  const stats = [
    { label: t('stat1Label'), end: 240, suffix: '+' },
    { label: t('stat2Label'), end: 8.5, prefix: '\u20ac', suffix: 'M', decimals: 1 },
    { label: t('stat3Label'), end: 2400, suffix: '+' },
    { label: t('stat4Label'), end: 4.9, decimals: 1 },
  ];

  return (
    <section
      className="relative z-[1]"
      style={{ padding: '5rem 0', background: 'var(--bg)' }}
    >
      <div className="mx-auto max-w-ctr px-8">
        <SectionHeader
          label={t('label')}
          title={t('title')}
          titleEm={t('titleEm')}
          subtitle={t('titleEnd')}
        />

        {/* Testimonial cards */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3"
          style={{ gap: '1rem', marginBottom: '2.5rem' }}
        >
          {testimonials.map((tm, i) => (
            <div
              key={i}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--b2)',
                borderRadius: '10px',
                padding: '1.5rem',
                transition: '0.3s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
              }}
            >
              {/* 5 stars */}
              <FiveStars />

              {/* Quote */}
              <p
                className="text-[var(--dark3)]"
                style={{
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                  marginBottom: '0.875rem',
                  fontStyle: 'italic',
                }}
              >
                {tm.quote}
              </p>

              {/* Author */}
              <div className="flex items-center" style={{ gap: '0.5rem' }}>
                {/* Avatar circle */}
                <div
                  className="grid place-items-center font-mono font-bold"
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'var(--teal-dim)',
                    color: 'var(--teal)',
                    border: '2px solid var(--teal)',
                    fontSize: '0.5625rem',
                    flexShrink: 0,
                  }}
                >
                  {tm.initials}
                </div>
                <div>
                  <div
                    className="font-bold text-[var(--dark2)]"
                    style={{ fontSize: '0.6875rem' }}
                  >
                    {tm.name}
                  </div>
                  <div
                    className="text-[var(--dark5)]"
                    style={{ fontSize: '0.625rem' }}
                  >
                    {tm.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats grid */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4"
          style={{ gap: '1rem' }}
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className="text-center"
              style={{
                padding: '1.5rem',
                background: 'var(--card)',
                border: '1px solid var(--b2)',
                borderRadius: '10px',
              }}
            >
              <div
                className="font-display font-extrabold text-teal"
                style={{ fontSize: 'clamp(1.5rem,3vw,2.25rem)' }}
              >
                <CounterAnimation
                  end={stat.end}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                />
              </div>
              <div
                className="font-mono text-[var(--dark5)] uppercase"
                style={{ fontSize: '0.5625rem', letterSpacing: '0.04em' }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
