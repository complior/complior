'use client';

import { useTranslations } from 'next-intl';
import { SectionHeader } from '@/components/ui/SectionHeader';

/* SVG icons matching the HTML design sprite: grid, shield, graduation cap, bot, chart, file */
const featureIcons = [
  // 1. Grid (i-grid)
  <svg key="grid" className="h-4 w-4" style={{ color: 'var(--teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>,
  // 2. Shield (i-shield)
  <svg key="shield" className="h-4 w-4" style={{ color: 'var(--teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>,
  // 3. Graduation cap (i-grad)
  <svg key="grad" className="h-4 w-4" style={{ color: 'var(--teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10l-10-6L2 10l10 6 10-6z" />
    <path d="M6 12v5c0 0 3 3 6 3s6-3 6-3v-5" />
    <line x1="22" y1="10" x2="22" y2="16" />
  </svg>,
  // 4. Bot (i-bot)
  <svg key="bot" className="h-4 w-4" style={{ color: 'var(--teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8" y2="16" />
    <line x1="16" y1="16" x2="16" y2="16" />
  </svg>,
  // 5. Chart (i-chart)
  <svg key="chart" className="h-4 w-4" style={{ color: 'var(--teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>,
  // 6. File (i-file)
  <svg key="file" className="h-4 w-4" style={{ color: 'var(--teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>,
];

export function FeatureGrid() {
  const t = useTranslations('features');

  const features = [
    { title: t('f1Title'), desc: t('f1Desc'), icon: featureIcons[0] },
    { title: t('f2Title'), desc: t('f2Desc'), icon: featureIcons[1] },
    { title: t('f3Title'), desc: t('f3Desc'), icon: featureIcons[2] },
    { title: t('f4Title'), desc: t('f4Desc'), icon: featureIcons[3] },
    { title: t('f5Title'), desc: t('f5Desc'), icon: featureIcons[4] },
    { title: t('f6Title'), desc: t('f6Desc'), icon: featureIcons[5] },
  ];

  return (
    <section
      className="relative z-[1]"
      style={{ padding: '5rem 0', background: 'var(--bg2)' }}
    >
      <div className="mx-auto max-w-ctr px-8">
        <SectionHeader label={t('label')} title={t('title')} titleEm={t('titleEm')} />

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          style={{ gap: '1rem' }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--b2)',
                borderRadius: '10px',
                padding: '1.75rem',
                transition: '0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Icon box */}
              <div
                className="grid place-items-center"
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'var(--teal-dim)',
                  border: '1px solid rgba(13,148,136,0.12)',
                  borderRadius: '8px',
                  marginBottom: '0.875rem',
                }}
              >
                {f.icon}
              </div>

              {/* Title */}
              <h3
                className="font-display font-bold text-[var(--dark)]"
                style={{ fontSize: '0.875rem', marginBottom: '0.375rem' }}
              >
                {f.title}
              </h3>

              {/* Description */}
              <p
                className="text-[var(--dark4)]"
                style={{ fontSize: '0.75rem', lineHeight: 1.6 }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
