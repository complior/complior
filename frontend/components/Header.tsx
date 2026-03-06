'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/app/providers';
import { logout } from '@/lib/auth';

const LOCALES = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'de', label: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}' },
] as const;

interface HeaderProps {
  mode?: 'marketing' | 'app' | 'admin';
}

export function Header({ mode = 'marketing' }: HeaderProps) {
  const locale = useLocale();
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
    setLangOpen(false);
  };

  const marketingLinks = [
    { href: `/${locale}#caps`, label: t('features') },
    { href: `/${locale}#free-tools`, label: t('freeTools') },
    { href: `/${locale}/registry`, label: t('registry') },
    { href: `/${locale}#pricing`, label: t('pricing') },
    { href: `/${locale}#faq`, label: t('faq') },
  ];

  const appLinks = [
    { href: `/${locale}/dashboard`, label: t('dashboard') },
    { href: `/${locale}/tools/inventory`, label: t('inventory') },
    { href: `/${locale}/tools/catalog`, label: t('catalog') },
    { href: `/${locale}/documents`, label: t('documents') },
    { href: `/${locale}/audit-package`, label: t('auditPackage') },
    { href: `/${locale}/settings`, label: t('settings') },
  ];

  const adminLinks = [
    { href: `/${locale}/admin/dashboard`, label: t('adminOverview') },
    { href: `/${locale}/admin/users`, label: t('adminUsers') },
    { href: `/${locale}/admin/organizations`, label: t('adminOrganizations') },
    { href: `/${locale}/admin/subscriptions`, label: t('adminSubscriptions') },
  ];

  const links = mode === 'admin' ? adminLinks : mode === 'app' ? appLinks : marketingLinks;

  /* ---- Exact CSS from HTML design ---- */
  /* header */
  const headerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    transition: '.4s',
    ...(scrolled
      ? {
          background: 'var(--hdr-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 1px 0 var(--b)',
        }
      : {}),
  };

  /* nav */
  const navStyle: React.CSSProperties = {
    maxWidth: 1140,
    margin: '0 auto',
    padding: '.875rem 2rem',
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

  /* .nv */
  const nvStyle: React.CSSProperties = {
    display: 'flex',
    gap: '2rem',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  };

  /* .nv a */
  const nvLinkStyle: React.CSSProperties = {
    color: 'var(--dark4)',
    fontSize: '.8125rem',
    fontWeight: 600,
    transition: '.25s',
    textDecoration: 'none',
  };

  /* .nr */
  const nrStyle: React.CSSProperties = {
    display: 'flex',
    gap: '.625rem',
    alignItems: 'center',
  };

  /* .bt base — explicit resets for <button> elements (browser defaults differ from <a>) */
  const btBase: React.CSSProperties = {
    padding: '.5rem 1.125rem',
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
    textDecoration: 'none',
    margin: 0,
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
    letterSpacing: 'normal',
  };

  /* .bt-g (ghost) */
  const btGhost: React.CSSProperties = {
    ...btBase,
    background: 'none',
    color: 'var(--dark4)',
  };

  /* .bt-t (teal solid) */
  const btTeal: React.CSSProperties = {
    ...btBase,
    background: 'var(--teal)',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(13,148,136,.2)',
  };

  /* .lang-cur — explicit resets for <button> (browser defaults differ from <div>) */
  const langCurStyle: React.CSSProperties = {
    fontFamily: 'var(--f-mono)',
    fontSize: '.625rem',
    fontWeight: 600,
    color: 'var(--dark4)',
    padding: '.3rem .5rem',
    border: '1px solid var(--b2)',
    borderRadius: 5,
    display: 'flex',
    alignItems: 'center',
    gap: '.25rem',
    transition: '.25s',
    cursor: 'pointer',
    userSelect: 'none' as const,
    background: 'none',
    margin: 0,
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
    lineHeight: 1.4,
    letterSpacing: 'normal',
  };

  /* .lang-dd */
  const langDdStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    background: 'var(--card)',
    border: '1px solid var(--b2)',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,.08)',
    padding: '.25rem',
    minWidth: 130,
    zIndex: 110,
  };

  /* .lang-opt — explicit resets for <button> */
  const langOptBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '.5rem',
    padding: '.375rem .625rem',
    fontFamily: 'var(--f-mono)',
    fontSize: '.5625rem',
    color: 'var(--dark3)',
    borderRadius: 5,
    transition: '.15s',
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    width: '100%',
    margin: 0,
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
    lineHeight: 1.4,
    letterSpacing: 'normal',
  };

  return (
    <header style={headerStyle}>
      <nav style={navStyle}>
        {/* Logo — .logo */}
        <Link href={mode === 'app' ? `/${locale}/dashboard` : mode === 'admin' ? `/${locale}/admin/dashboard` : `/${locale}`} style={logoStyle}>
          Complior<span style={logoDotStyle}>.ai</span>
        </Link>

        {/* Nav — .nv */}
        <ul style={nvStyle} className="hdr-nv">
          {links.map((link, i) => (
            <li key={`${link.href}-${i}`}>
              <Link
                href={link.href}
                style={nvLinkStyle}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'var(--teal)'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'var(--dark4)'; }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right side — .nr */}
        <div style={nrStyle}>
          {/* Language Switcher — .lang-sw */}
          <div ref={langRef} style={{ position: 'relative' }} className="hdr-lang">
            <button
              style={langCurStyle}
              onClick={() => setLangOpen(!langOpen)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--b3)';
                (e.currentTarget as HTMLElement).style.color = 'var(--dark2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)';
                (e.currentTarget as HTMLElement).style.color = 'var(--dark4)';
              }}
            >
              {locale.toUpperCase()}
              <span style={{ fontSize: '.5rem', opacity: 0.5 }}>▾</span>
            </button>
            {langOpen && (
              <div style={langDdStyle}>
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => switchLocale(l.code)}
                    style={{
                      ...langOptBase,
                      ...(locale === l.code ? { color: 'var(--teal)', fontWeight: 700 } : {}),
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg2)';
                      if (locale !== l.code) (e.currentTarget as HTMLElement).style.color = 'var(--dark)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'none';
                      if (locale !== l.code) (e.currentTarget as HTMLElement).style.color = 'var(--dark3)';
                    }}
                  >
                    <span>{l.flag}</span>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle — .bt .bt-g */}
          <button
            style={btGhost}
            onClick={toggleTheme}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--dark)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--dark4)'; }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '\u2600\uFE0F Light' : '\uD83C\uDF19 Dark'}
          </button>

          {(mode === 'admin' || mode === 'app') && (
            <button
              style={{ ...btGhost, color: 'var(--coral, #e74c3c)' }}
              onClick={async () => {
                await logout();
                router.push(`/${locale}/auth/login`);
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              {tc('logout')}
            </button>
          )}

          {mode === 'marketing' && (
            <>
              {/* Sign In — .bt .bt-g */}
              <Link
                href={`/${locale}/auth/login`}
                style={btGhost}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--dark)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--dark4)'; }}
              >
                {tc('signIn')}
              </Link>

              {/* Get Started — .bt .bt-t */}
              <Link
                href={`/${locale}/auth/register`}
                style={btTeal}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'var(--teal2)';
                  el.style.boxShadow = '0 4px 16px rgba(13,148,136,.25)';
                  el.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'var(--teal)';
                  el.style.boxShadow = '0 2px 8px rgba(13,148,136,.2)';
                  el.style.transform = 'translateY(0)';
                }}
              >
                {tc('getStarted')}
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Responsive: hide nav + lang-sw at ≤1024px (matches original design) */}
      <style jsx>{`
        @media (max-width: 1024px) {
          .hdr-nv { display: none !important; }
          .hdr-lang { display: none !important; }
        }
      `}</style>
    </header>
  );
}
