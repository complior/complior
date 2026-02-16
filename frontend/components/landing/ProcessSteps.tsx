'use client';

import { useTranslations } from 'next-intl';
import { SectionHeader } from '@/components/ui/SectionHeader';

export function ProcessSteps() {
  const t = useTranslations('process');

  const steps = [
    { num: '01', title: t('step1Title'), desc: t('step1Desc') },
    { num: '02', title: t('step2Title'), desc: t('step2Desc') },
    { num: '03', title: t('step3Title'), desc: t('step3Desc') },
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
          subtitle={t('subtitle')}
        />

        <div
          className="grid grid-cols-1 sm:grid-cols-3"
          style={{ gap: '1.25rem' }}
        >
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative overflow-hidden"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--b2)',
                borderRadius: '10px',
                padding: '1.75rem 1.5rem',
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
              {/* Watermark number */}
              <div
                className="pointer-events-none absolute select-none font-display font-extrabold text-teal"
                style={{
                  fontSize: '2.25rem',
                  opacity: 0.08,
                  top: '0.625rem',
                  right: '1rem',
                  lineHeight: 1,
                }}
              >
                {step.num}
              </div>

              {/* Content */}
              <h3
                className="font-display font-bold text-[var(--dark)]"
                style={{ fontSize: '0.9375rem', marginBottom: '0.4375rem' }}
              >
                {step.title}
              </h3>
              <p
                className="text-[var(--dark4)]"
                style={{ fontSize: '0.8125rem', lineHeight: 1.6 }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
