'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useTheme } from '@/app/providers';

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const { theme, toggleTheme } = useTheme();

  /* header — fixed, blurred backdrop */
  const headerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: 'var(--hdr-bg)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 1px 0 var(--b)',
    transition: '.4s',
  };

  /* nav */
  const navStyle: React.CSSProperties = {
    maxWidth: 1140,
    margin: '0 auto',
    padding: '.75rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  };

  /* .logo-d */
  const logoDotStyle: React.CSSProperties = {
    fontFamily: 'var(--f-mono)',
    fontSize: '.625rem',
    fontWeight: 500,
    color: 'var(--teal)',
    opacity: 0.7,
  };

  /* .bt .bt-g (ghost button for theme toggle) */
  const btGhostStyle: React.CSSProperties = {
    padding: '.4375rem 1rem',
    borderRadius: 6,
    fontWeight: 700,
    fontSize: '.8125rem',
    transition: '.25s',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--f-body)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '.4375rem',
    lineHeight: 1.4,
    background: 'none',
    color: 'var(--dark4)',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={headerStyle}>
        <nav style={navStyle}>
          {/* Logo */}
          <Link href={`/${locale}`} style={logoStyle}>
            Complior<span style={logoDotStyle}>.ai</span>
          </Link>

          {/* Right side — theme toggle only */}
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <button
              style={btGhostStyle}
              onClick={toggleTheme}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--dark)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--dark4)'; }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '\u2600\uFE0F Light' : '\uD83C\uDF19 Dark'}
            </button>
          </div>
        </nav>
      </header>

      <main style={{ flex: 1, paddingTop: '5rem' }}>
        {children}
      </main>

      <style jsx>{`
        @media (max-width: 768px) {
          nav { padding: .75rem 1.25rem !important; }
        }
      `}</style>
    </div>
  );
}
