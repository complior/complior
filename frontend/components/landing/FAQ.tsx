'use client';

import { useTranslations } from 'next-intl';
import { SectionHeader } from '@/components/ui/SectionHeader';

/* i-help icon matching the HTML sprite */
const IconHelp = () => (
  <svg style={{ display: 'inline-block', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0, marginTop: 3 }} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/* .faq-q */
const faqQStyle: React.CSSProperties = {
  fontFamily: 'var(--f-display)',
  fontSize: '.9375rem',
  fontWeight: 700,
  color: 'var(--dark)',
  marginBottom: '.375rem',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '.625rem',
  margin: 0,
};

/* .faq-a */
const faqAStyle: React.CSSProperties = {
  fontSize: '.75rem',
  color: 'var(--dark4)',
  lineHeight: 1.65,
  paddingLeft: '1.625rem',
  margin: 0,
};

export function FAQ() {
  const t = useTranslations('faqSection');

  const faqs = [
    { q: t('q1'), a: t('a1') },
    { q: t('q2'), a: t('a2') },
    { q: t('q3'), a: t('a3') },
    { q: t('q4'), a: t('a4') },
    { q: t('q5'), a: t('a5') },
    { q: t('q6'), a: t('a6') },
  ];

  return (
    <section
      id="faq"
      style={{ background: 'var(--bg2)', padding: '5rem 0', position: 'relative', zIndex: 1 }}
    >
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 2rem' }}>
        <SectionHeader label={t('label')} title={t('title')} titleEm={t('titleEm')} />

        {/* .faq-l */}
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rv"
              style={{ borderBottom: '1px solid var(--b)', padding: '1.125rem 0' }}
            >
              <h3 style={faqQStyle}>
                <span style={{ color: 'var(--teal)' }}>
                  <IconHelp />
                </span>
                {faq.q}
              </h3>
              <p style={faqAStyle}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
