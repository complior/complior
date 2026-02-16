'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export function Footer() {
  const locale = useLocale();
  const t = useTranslations('footer');

  const columns = [
    {
      title: t('product'),
      links: [
        { label: t('features'), href: `/${locale}/#caps` },
        { label: t('pricingLink'), href: `/${locale}/pricing` },
        { label: t('roadmap'), href: '#' },
        { label: t('changelog'), href: '#' },
      ],
    },
    {
      title: t('resources'),
      links: [
        { label: t('blog'), href: '#' },
        { label: t('helpCenter'), href: '#' },
        { label: t('apiDocs'), href: '#' },
        { label: t('status'), href: '#' },
      ],
    },
    {
      title: t('company'),
      links: [
        { label: t('about'), href: '#' },
        { label: t('contact'), href: '#' },
        { label: t('careers'), href: '#' },
        { label: t('press'), href: '#' },
      ],
    },
    {
      title: t('legal'),
      links: [
        { label: t('privacy'), href: '#' },
        { label: t('terms'), href: '#' },
        { label: t('dpa'), href: '#' },
        { label: t('imprint'), href: '#' },
      ],
    },
  ];

  /* footer */
  const footerStyle: React.CSSProperties = {
    background: 'var(--bg)',
    borderTop: '2px solid var(--teal)',
    padding: '3rem 0 1.5rem',
  };

  /* .ctr */
  const ctrStyle: React.CSSProperties = {
    maxWidth: 1140,
    margin: '0 auto',
    padding: '0 2rem',
  };

  /* .fg — footer grid */
  const fgStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '2fr repeat(4, 1fr)',
    gap: '2.5rem',
    marginBottom: '2rem',
  };

  /* .logo */
  const logoStyle: React.CSSProperties = {
    fontFamily: 'var(--f-display)',
    fontWeight: 700,
    fontSize: '1.125rem',
    color: 'var(--dark)',
    display: 'flex',
    alignItems: 'center',
    gap: '.5rem',
    letterSpacing: '-.02em',
    textDecoration: 'none',
    marginBottom: '.25rem',
  };

  /* .logo-d */
  const logoDotStyle: React.CSSProperties = {
    fontFamily: 'var(--f-mono)',
    fontSize: '.625rem',
    fontWeight: 500,
    color: 'var(--teal)',
    opacity: 0.7,
  };

  /* brand description */
  const brandDescStyle: React.CSSProperties = {
    fontSize: '.75rem',
    color: 'var(--dark5)',
    maxWidth: 260,
    lineHeight: 1.6,
    margin: 0,
  };

  /* .fh — footer heading */
  const fhStyle: React.CSSProperties = {
    fontFamily: 'var(--f-mono)',
    fontSize: '.5rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '.12em',
    color: 'var(--dark3)',
    marginBottom: '.75rem',
  };

  /* .fc — footer column list */
  const fcStyle: React.CSSProperties = {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '.4375rem',
    margin: 0,
    padding: 0,
  };

  /* .fc a */
  const fcLinkStyle: React.CSSProperties = {
    color: 'var(--dark4)',
    fontSize: '.75rem',
    transition: '.2s',
    textDecoration: 'none',
  };

  /* .fm — footer meta */
  const fmStyle: React.CSSProperties = {
    paddingTop: '1.25rem',
    borderTop: '1px solid var(--b)',
    display: 'flex',
    justifyContent: 'space-between',
    fontFamily: 'var(--f-mono)',
    fontSize: '.5625rem',
    color: 'var(--dark5)',
  };

  return (
    <footer style={footerStyle}>
      <div style={ctrStyle}>
        {/* .fg — footer grid */}
        <div style={fgStyle} className="footer-grid">
          {/* Brand column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            <Link href={`/${locale}`} style={logoStyle}>
              Complior<span style={logoDotStyle}>.ai</span>
            </Link>
            <p style={brandDescStyle}>{t('brand')}</p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <div style={fhStyle}>{col.title}</div>
              <ul style={fcStyle}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      style={fcLinkStyle}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--teal)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--dark4)'; }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* .fm — footer meta */}
        <div style={fmStyle} className="footer-meta">
          <span>{t('copyright')}</span>
          <span>{t('madeIn')}</span>
        </div>
      </div>

      {/* Responsive styles for grid breakpoints */}
      <style jsx>{`
        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
          .footer-meta {
            flex-direction: column !important;
            gap: .5rem !important;
          }
        }
      `}</style>
    </footer>
  );
}
