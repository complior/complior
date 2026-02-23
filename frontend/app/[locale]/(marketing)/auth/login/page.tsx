'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getSession, loginWithPassword, sendMagicLink, getSocialLoginUrl } from '@/lib/auth';

/* -- SVG Icons ------------------------------------------------------------ */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);
const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const ShieldCheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="M9 12l2 2 4-4" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth');
  const tc = useTranslations('common');

  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    getSession().then((user) => {
      if (user?.active) {
        router.replace(`/${locale}/dashboard`);
      } else {
        setChecking(false);
      }
    }).catch(() => {
      setChecking(false);
    });
  }, [router, locale]);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleMagicLink = async () => {
    setError(null);
    setEmailError(false);
    if (!validateEmail(email)) {
      setEmailError(true);
      return;
    }
    setLoading(true);
    try {
      await sendMagicLink(email);
      router.push(`/${locale}/auth/verify-code?email=${encodeURIComponent(email)}`);
    } catch {
      setError('Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    setError(null);
    setEmailError(false);
    setPasswordError(false);
    if (!validateEmail(email)) { setEmailError(true); return; }
    if (!password) { setPasswordError(true); return; }

    setLoading(true);
    try {
      const result = await loginWithPassword(email, password);
      if (result.success) {
        router.push(`/${locale}/dashboard`);
      } else {
        setError(t('invalidCredentials'));
      }
    } catch {
      setError(t('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)' }}>
        <p style={{ color: 'var(--dark5)', fontSize: '0.875rem' }}>{tc('loading')}</p>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .field-input-l:focus {
          border-color: var(--teal) !important;
          box-shadow: 0 0 0 3px var(--teal-dim) !important;
        }
        .field-input-l::placeholder { color: var(--dark5); }
        .btn-primary-l:hover {
          background: var(--teal2) !important;
          box-shadow: 0 4px 16px var(--teal-glow) !important;
          transform: translateY(-1px);
        }
        .btn-primary-l:active { transform: translateY(0); }
        .btn-primary-l:disabled { opacity: 0.7; cursor: not-allowed; transform: none !important; }
        .btn-social-l:hover {
          border-color: var(--dark3) !important;
          background: var(--bg2) !important;
        }
        .toggle-link-l:hover { color: var(--teal) !important; }
        .footer-link-l:hover { text-decoration: underline; }
        @media (max-width: 480px) {
          .auth-card-l { padding: 2rem 1.5rem !important; border-radius: 12px !important; }
          .auth-title-l { font-size: 1.25rem !important; }
        }
      `}</style>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 56px)', padding: '2rem',
      }}>
        <div className="auth-card-l" style={{
          maxWidth: '420px', width: '100%', padding: '2.5rem', borderRadius: '14px',
          border: '1px solid var(--b2)', background: 'var(--card)',
          boxShadow: '0 16px 48px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.03)',
          animation: 'cardIn .5s ease both',
        }}>
          {/* Logo */}
          <Link href={`/${locale}`} style={{
            fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '1.25rem',
            color: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem', letterSpacing: '-0.02em', marginBottom: '2rem', textDecoration: 'none',
          }}>
            Complior<span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.625rem', fontWeight: 500, color: 'var(--teal)', opacity: 0.7 }}>.ai</span>
          </Link>

          {/* Title */}
          <h1 className="auth-title-l" style={{
            fontFamily: 'var(--f-display)', fontSize: '1.5rem', fontWeight: 700,
            color: 'var(--dark)', marginBottom: '0.375rem', letterSpacing: '-0.02em', textAlign: 'center',
          }}>{t('welcomeBack')}</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--dark4)', marginBottom: '2rem', textAlign: 'center' }}>
            {t('signInSubtitle')}
          </p>

          {/* Error banner */}
          {error && (
            <div style={{
              marginBottom: '1rem', borderRadius: '8px', border: '1px solid var(--coral)',
              background: 'var(--coral-dim)', padding: '0.625rem 0.875rem',
            }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--coral)', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Social OAuth buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button className="btn-social-l" onClick={() => { window.location.href = getSocialLoginUrl('google'); }} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.6875rem', border: '1.5px solid var(--b2)', borderRadius: '8px',
              background: 'var(--card)', cursor: 'pointer', fontFamily: 'var(--f-body)',
              fontSize: '0.8125rem', fontWeight: 600, color: 'var(--dark3)', transition: '0.25s',
            }}>
              <GoogleIcon /> Google
            </button>
            <button className="btn-social-l" onClick={() => { window.location.href = getSocialLoginUrl('github'); }} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.6875rem', border: '1.5px solid var(--b2)', borderRadius: '8px',
              background: 'var(--card)', cursor: 'pointer', fontFamily: 'var(--f-body)',
              fontSize: '0.8125rem', fontWeight: 600, color: 'var(--dark3)', transition: '0.25s',
            }}>
              <GitHubIcon /> GitHub
            </button>
          </div>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--b2)' }} />
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.5625rem', color: 'var(--dark5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {tc('or')}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--b2)' }} />
          </div>

          {/* Email field */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block', fontFamily: 'var(--f-mono)', fontSize: '0.5625rem', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dark4)', marginBottom: '0.4375rem',
            }}>{t('email')}</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark5)' }}>
                <MailIcon />
              </span>
              <input
                className="field-input-l"
                type="email"
                placeholder={t('emailPlaceholder')}
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(false); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { mode === 'magic' ? handleMagicLink() : handlePasswordLogin(); } }}
                style={{
                  width: '100%', padding: '0.6875rem 0.875rem 0.6875rem 2.5rem',
                  border: `1.5px solid ${emailError ? 'var(--coral)' : 'var(--b2)'}`, borderRadius: '8px',
                  fontFamily: 'var(--f-body)', fontSize: '0.875rem', color: 'var(--dark)',
                  background: 'var(--bg)', outline: 'none', transition: 'border-color .25s, box-shadow .25s',
                  ...(emailError ? { boxShadow: '0 0 0 3px rgba(231,76,60,.06)' } : {}),
                }}
              />
            </div>
            {emailError && <div style={{ fontSize: '0.6875rem', color: 'var(--coral)', marginTop: '0.3125rem' }}>{t('emailError')}</div>}
          </div>

          {/* Password field (shown in password mode) */}
          {mode === 'password' && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4375rem' }}>
                <label style={{
                  fontFamily: 'var(--f-mono)', fontSize: '0.5625rem', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dark4)',
                }}>{t('password')}</label>
                <Link href={`/${locale}/auth/forgot-password`} style={{
                  fontFamily: 'var(--f-mono)', fontSize: '0.5625rem', color: 'var(--teal)',
                  textDecoration: 'none', letterSpacing: '0.04em',
                }}>{t('forgotPassword')}</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark5)' }}>
                  <LockIcon />
                </span>
                <input
                  className="field-input-l"
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(false); setError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordLogin(); }}
                  style={{
                    width: '100%', padding: '0.6875rem 0.875rem 0.6875rem 2.5rem',
                    border: `1.5px solid ${passwordError ? 'var(--coral)' : 'var(--b2)'}`, borderRadius: '8px',
                    fontFamily: 'var(--f-body)', fontSize: '0.875rem', color: 'var(--dark)',
                    background: 'var(--bg)', outline: 'none', transition: 'border-color .25s, box-shadow .25s',
                    ...(passwordError ? { boxShadow: '0 0 0 3px rgba(231,76,60,.06)' } : {}),
                  }}
                />
              </div>
              {passwordError && <div style={{ fontSize: '0.6875rem', color: 'var(--coral)', marginTop: '0.3125rem' }}>{t('passwordRequired')}</div>}
            </div>
          )}

          {/* Primary CTA */}
          {mode === 'magic' ? (
            <button className="btn-primary-l" onClick={handleMagicLink} disabled={loading} style={{
              width: '100%', padding: '0.75rem 1.25rem', borderRadius: '8px',
              fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: '0.875rem',
              cursor: 'pointer', border: 'none', transition: '0.25s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              background: 'var(--teal)', color: '#fff', boxShadow: '0 2px 8px var(--teal-glow)',
            }}>
              {loading ? tc('loading') : t('sendMagicLink')}
            </button>
          ) : (
            <button className="btn-primary-l" onClick={handlePasswordLogin} disabled={loading} style={{
              width: '100%', padding: '0.75rem 1.25rem', borderRadius: '8px',
              fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: '0.875rem',
              cursor: 'pointer', border: 'none', transition: '0.25s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              background: 'var(--teal)', color: '#fff', boxShadow: '0 2px 8px var(--teal-glow)',
            }}>
              {loading ? tc('loading') : t('signInBtn')}
            </button>
          )}

          {/* Mode toggle */}
          <button className="toggle-link-l" onClick={() => { setMode(mode === 'magic' ? 'password' : 'magic'); setError(null); }} style={{
            width: '100%', background: 'none', color: 'var(--dark4)', border: 'none',
            fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', marginTop: '0.75rem',
            transition: '0.2s', fontFamily: 'var(--f-body)', padding: '0.5rem', textAlign: 'center',
          }}>
            {mode === 'magic' ? t('orPassword') : t('sendMagicLink')}
          </button>
        </div>

        {/* Trust line */}
        <div style={{
          marginTop: '1.5rem', textAlign: 'center', fontFamily: 'var(--f-mono)',
          fontSize: '0.5rem', color: 'var(--dark5)', letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
        }}>
          <ShieldCheckIcon />
          <span>{t('trustLine')}</span>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '1.75rem', fontSize: '0.8125rem', color: 'var(--dark4)', textAlign: 'center' }}>
          {t('noAccount')}{' '}
          <Link href={`/${locale}/auth/register`} className="footer-link-l" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
            {t('createOne')}
          </Link>
        </div>
      </div>
    </>
  );
}
