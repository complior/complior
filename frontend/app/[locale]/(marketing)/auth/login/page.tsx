'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getSession, createLoginFlow, submitLogin } from '@/lib/ory';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth');
  const tc = useTranslations('common');

  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailErr, setEmailErr] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordErr, setPasswordErr] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const pwRef = useRef<HTMLInputElement>(null);
  const resentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateEmail = useCallback((v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), []);

  useEffect(() => {
    getSession().then((session) => {
      if (session?.active) {
        router.replace(`/${locale}/dashboard`);
      } else {
        setCheckingSession(false);
      }
    });
  }, [router, locale]);

  useEffect(() => {
    return () => {
      if (resentTimerRef.current) clearTimeout(resentTimerRef.current);
    };
  }, []);

  const handleInputChange = useCallback(() => {
    setError(null);
  }, []);

  const handleEmailChange = useCallback((v: string) => {
    setEmail(v);
    setEmailErr(false);
    handleInputChange();
  }, [handleInputChange]);

  const handlePasswordChange = useCallback((v: string) => {
    setPassword(v);
    setPasswordErr(false);
    handleInputChange();
  }, [handleInputChange]);

  const handleMagicLink = async () => {
    if (!validateEmail(email)) { setEmailErr(true); return; }
    setLoading(true);
    setError(null);
    try {
      const flow = await createLoginFlow();
      await submitLogin(flow.id, { method: 'code', identifier: email });
      setMagicLinkEmail(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    let ok = true;
    if (!validateEmail(email)) { setEmailErr(true); ok = false; }
    if (password.length < 1) { setPasswordErr(true); ok = false; }
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      const flow = await createLoginFlow();
      const result = await submitLogin(flow.id, { method: 'password', identifier: email, password });
      if (result.session) {
        await api.auth.me();
        router.push(`/${locale}/dashboard`);
      } else if (result.error) {
        setError(result.error.message || t('invalidCredentials'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resent || !magicLinkEmail) return;
    try {
      const flow = await createLoginFlow();
      await submitLogin(flow.id, { method: 'code', identifier: magicLinkEmail });
    } catch { /* silent */ }
    setResent(true);
    resentTimerRef.current = setTimeout(() => setResent(false), 2500);
  };

  const togglePassword = () => {
    setShowPw((p) => {
      if (!p) setTimeout(() => pwRef.current?.focus(), 0);
      return !p;
    });
  };

  const backToLogin = () => {
    setMagicLinkEmail(null);
    setError(null);
    setResent(false);
  };

  /* ── Styles ────────────────────────────────────────────── */
  const s = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 56px)',
      padding: '2rem',
    },
    card: {
      maxWidth: '420px',
      width: '100%',
      padding: '2.5rem',
      borderRadius: '14px',
      border: '1px solid var(--b2)',
      background: 'var(--card)',
      boxShadow: '0 16px 48px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.03)',
      animation: 'cardIn 0.5s ease both',
      transition: 'background .35s, border-color .35s, box-shadow .35s',
      position: 'relative' as const,
    },
    logo: {
      fontFamily: 'var(--f-display)',
      fontWeight: 700,
      fontSize: '1.25rem',
      color: 'var(--dark)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      letterSpacing: '-0.02em',
      marginBottom: '2rem',
      textDecoration: 'none',
    },
    logoDot: {
      fontFamily: 'var(--f-mono)',
      fontSize: '0.625rem',
      fontWeight: 500,
      color: 'var(--teal)',
      opacity: 0.7,
    },
    title: {
      fontFamily: 'var(--f-display)',
      fontSize: '1.5rem',
      fontWeight: 700,
      color: 'var(--dark)',
      marginBottom: '0.375rem',
      letterSpacing: '-0.02em',
    },
    sub: {
      fontSize: '0.875rem',
      color: 'var(--dark4)',
      marginBottom: '2rem',
    },
    errorBanner: {
      background: 'rgba(231,76,60,.06)',
      border: '1px solid rgba(231,76,60,.15)',
      borderRadius: '8px',
      padding: '0.625rem 0.875rem',
      marginBottom: '1.25rem',
      fontSize: '0.75rem',
      color: 'var(--coral)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      lineHeight: 1.5,
    },
    field: {
      marginBottom: '1.25rem',
    },
    fieldLabel: {
      display: 'block',
      fontFamily: 'var(--f-mono)',
      fontSize: '0.5625rem',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      color: 'var(--dark4)',
      marginBottom: '0.4375rem',
    },
    fieldInput: {
      width: '100%',
      padding: '0.6875rem 0.875rem',
      border: '1.5px solid var(--b2)',
      borderRadius: '8px',
      fontFamily: 'var(--f-body)',
      fontSize: '0.875rem',
      color: 'var(--dark)',
      background: 'var(--bg)',
      outline: 'none',
      transition: 'border-color .25s, box-shadow .25s',
    },
    fieldInputErr: {
      borderColor: 'var(--coral)',
      boxShadow: '0 0 0 3px rgba(231,76,60,.06)',
    },
    fieldError: {
      fontSize: '0.6875rem',
      color: 'var(--coral)',
      marginTop: '0.3125rem',
    },
    btn: {
      width: '100%',
      padding: '0.75rem 1.25rem',
      borderRadius: '8px',
      fontFamily: 'var(--f-body)',
      fontWeight: 700,
      fontSize: '0.875rem',
      cursor: 'pointer',
      border: 'none',
      transition: '.25s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      background: 'var(--teal)',
      color: '#fff',
      boxShadow: '0 2px 8px var(--teal-glow)',
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      margin: '1.5rem 0',
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      background: 'var(--b)',
    },
    dividerText: {
      fontFamily: 'var(--f-mono)',
      fontSize: '0.5rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      color: 'var(--dark5)',
      cursor: 'pointer',
      transition: '.2s',
      whiteSpace: 'nowrap' as const,
    },
    pwWrap: {
      position: 'relative' as const,
    },
    pwToggle: {
      position: 'absolute' as const,
      right: '0.75rem',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--dark5)',
      fontSize: '0.75rem',
      padding: 0,
      lineHeight: 1,
    },
    forgotLink: {
      display: 'block',
      textAlign: 'right' as const,
      marginTop: '-0.75rem',
      marginBottom: '1.25rem',
    },
    forgotAnchor: {
      fontSize: '0.75rem',
      color: 'var(--teal)',
      textDecoration: 'none',
      fontWeight: 500,
      transition: '.2s',
    },
    footer: {
      marginTop: '1.75rem',
      fontSize: '0.8125rem',
      color: 'var(--dark4)',
      textAlign: 'center' as const,
    },
    footerLink: {
      color: 'var(--teal)',
      fontWeight: 600,
      textDecoration: 'none',
      transition: '.2s',
    },
    /* magic link sent */
    mlSent: {
      textAlign: 'center' as const,
    },
    mlIcon: {
      width: '56px',
      height: '56px',
      borderRadius: '14px',
      background: 'var(--teal-dim)',
      border: '1px solid var(--teal-glow)',
      display: 'grid',
      placeItems: 'center',
      margin: '0 auto 1.25rem',
    },
    mlTitle: {
      fontFamily: 'var(--f-display)',
      fontSize: '1.25rem',
      fontWeight: 700,
      color: 'var(--dark)',
      marginBottom: '0.375rem',
    },
    mlEmail: {
      fontFamily: 'var(--f-mono)',
      fontSize: '0.75rem',
      color: 'var(--teal)',
      marginBottom: '1.25rem',
      wordBreak: 'break-all' as const,
    },
    mlHint: {
      fontSize: '0.8125rem',
      color: 'var(--dark4)',
      marginBottom: '1.5rem',
      lineHeight: 1.6,
    },
    mlResend: {
      background: 'none',
      border: 'none',
      color: 'var(--teal)',
      fontFamily: 'var(--f-body)',
      fontSize: '0.8125rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: '.2s',
    },
    mlResendDone: {
      color: 'var(--green)',
    },
    linkBtn: {
      background: 'none',
      border: 'none',
      color: 'var(--teal)',
      fontFamily: 'var(--f-body)',
      fontSize: '0.8125rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: '.2s',
      padding: 0,
    },
  };

  /* ── Loading state while checking session ───────────── */
  if (checkingSession) {
    return (
      <div style={s.container}>
        <p style={{ color: 'var(--dark5)' }}>{tc('loading')}</p>
      </div>
    );
  }

  /* ── Magic Link Sent State ──────────────────────────── */
  if (magicLinkEmail) {
    return (
      <>
        <style jsx>{`
          .footer-a:hover {
            text-decoration: underline !important;
          }
          @media (max-width: 480px) {
            .auth-card { padding: 2rem 1.5rem !important; border-radius: 12px !important; }
          }
        `}</style>
        <div style={s.container}>
          <Link href={`/${locale}`} style={s.logo}>
            Complior<span style={s.logoDot}>.ai</span>
          </Link>

          <div className="auth-card" style={s.card}>
            <div style={s.mlSent}>
              <div style={s.mlIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h2 style={s.mlTitle}>{t('checkEmail')}</h2>
              <div style={s.mlEmail}>{magicLinkEmail}</div>
              <p style={s.mlHint}>{t('magicLinkHint')}</p>
              <button
                type="button"
                onClick={handleResend}
                style={{
                  ...s.mlResend,
                  ...(resent ? s.mlResendDone : {}),
                }}
                onMouseEnter={(e) => { if (!resent) (e.currentTarget.style.textDecoration = 'underline'); }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                {resent ? t('resent') : t('resend')}
              </button>
              <div style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={backToLogin}
                  style={s.linkBtn}
                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                >
                  {t('backToSignIn')}
                </button>
              </div>
            </div>
          </div>

          <div style={s.footer}>
            {t('noAccount')}{' '}
            <Link href={`/${locale}/auth/register`} className="footer-a" style={s.footerLink}>
              {t('createOne')}
            </Link>
          </div>
        </div>
      </>
    );
  }

  /* ── Default Login Form State ───────────────────────── */
  return (
    <>
      <style jsx>{`
        .field-input:focus {
          border-color: var(--teal) !important;
          box-shadow: 0 0 0 3px var(--teal-dim) !important;
        }
        .btn-primary:hover {
          background: var(--teal2) !important;
          box-shadow: 0 4px 16px var(--teal-glow) !important;
          transform: translateY(-1px);
        }
        .btn-primary:active {
          transform: translateY(0);
        }
        .divider-text:hover {
          color: var(--teal) !important;
        }
        .forgot-a:hover {
          text-decoration: underline !important;
        }
        .footer-a:hover {
          text-decoration: underline !important;
        }
        .pw-toggle-btn:hover {
          color: var(--dark3) !important;
        }
        @media (max-width: 480px) {
          .auth-card {
            padding: 2rem 1.5rem !important;
            border-radius: 12px !important;
          }
          .auth-title {
            font-size: 1.25rem !important;
          }
        }
      `}</style>
      <div style={s.container}>
        {/* Logo */}
        <Link href={`/${locale}`} style={s.logo}>
          Complior<span style={s.logoDot}>.ai</span>
        </Link>

        {/* Auth Card */}
        <div className="auth-card" style={s.card}>
          <h1 className="auth-title" style={s.title}>{t('welcomeBack')}</h1>
          <p style={s.sub}>{t('signInSubtitle')}</p>

          {/* Error Banner */}
          {error && (
            <div style={s.errorBanner}>
              <svg viewBox="0 0 24 24" style={{ flexShrink: 0, width: '16px', height: '16px' }} fill="none" stroke="var(--coral)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Email Field */}
          <div style={s.field}>
            <label style={s.fieldLabel} htmlFor="login-email">{t('email')}</label>
            <input
              className="field-input"
              id="login-email"
              type="email"
              placeholder={t('emailPlaceholder')}
              autoComplete="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              style={{
                ...s.fieldInput,
                ...(emailErr ? s.fieldInputErr : {}),
              }}
            />
            {emailErr && <div style={s.fieldError}>{t('emailError')}</div>}
          </div>

          {/* Magic Link Button */}
          <button
            type="button"
            className="btn-primary"
            onClick={handleMagicLink}
            disabled={loading}
            style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
          >
            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {t('sendMagicLink')}
          </button>

          {/* Divider */}
          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span className="divider-text" style={s.dividerText} onClick={togglePassword} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') togglePassword(); }}>
              {t('orPassword')}
            </span>
            <div style={s.dividerLine} />
          </div>

          {/* Password Section */}
          {showPw && (
            <div>
              <div style={s.field}>
                <label style={s.fieldLabel} htmlFor="login-password">{t('password')}</label>
                <div style={s.pwWrap}>
                  <input
                    className="field-input"
                    id="login-password"
                    ref={pwRef}
                    type={pwVisible ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    style={{
                      ...s.fieldInput,
                      paddingRight: '2.75rem',
                      ...(passwordErr ? s.fieldInputErr : {}),
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordLogin(); }}
                  />
                  <button
                    type="button"
                    className="pw-toggle-btn"
                    style={s.pwToggle}
                    onClick={() => setPwVisible((v) => !v)}
                    aria-label="Toggle password visibility"
                  >
                    {pwVisible ? '\u{1F648}' : '\u{1F441}'}
                  </button>
                </div>
                {passwordErr && <div style={s.fieldError}>{t('passwordRequired')}</div>}
              </div>
              <div style={s.forgotLink}>
                <Link href={`/${locale}/auth/forgot-password`} className="forgot-a" style={s.forgotAnchor}>
                  {t('forgotPassword')}
                </Link>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={handlePasswordLogin}
                disabled={loading}
                style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
              >
                {t('signInBtn')}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          {t('noAccount')}{' '}
          <Link href={`/${locale}/auth/register`} className="footer-a" style={s.footerLink}>
            {t('createOne')}
          </Link>
        </div>
      </div>
    </>
  );
}
