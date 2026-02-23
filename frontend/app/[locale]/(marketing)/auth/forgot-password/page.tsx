'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { sendPasswordReset } from '@/lib/auth';

const ShieldCheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="M9 12l2 2 4-4" />
  </svg>
);
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
  </svg>
);

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useTranslations('auth');
  const tc = useTranslations('common');

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async () => {
    setEmailError(false);
    if (!validateEmail(email)) { setEmailError(true); return; }

    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
      setCooldown(60);
    } catch {
      // Always show success to prevent enumeration
      setSent(true);
      setCooldown(60);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setCooldown(60);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .field-input-fp:focus {
          border-color: var(--teal) !important;
          box-shadow: 0 0 0 3px var(--teal-dim) !important;
        }
        .field-input-fp::placeholder { color: var(--dark5); }
        .btn-primary-fp:hover {
          background: var(--teal2) !important;
          box-shadow: 0 4px 16px var(--teal-glow) !important;
          transform: translateY(-1px);
        }
        .btn-primary-fp:active { transform: translateY(0); }
        .btn-primary-fp:disabled { opacity: 0.7; cursor: not-allowed; transform: none !important; }
        .btn-ghost-fp:hover { color: var(--teal) !important; }
        @media (max-width: 480px) {
          .auth-card-fp { padding: 2rem 1.5rem !important; border-radius: 12px !important; }
          .auth-title-fp { font-size: 1.25rem !important; }
        }
      `}</style>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 56px)', padding: '2rem',
      }}>
        <div className="auth-card-fp" style={{
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

          {!sent ? (
            <>
              <h1 className="auth-title-fp" style={{
                fontFamily: 'var(--f-display)', fontSize: '1.5rem', fontWeight: 700,
                color: 'var(--dark)', marginBottom: '0.375rem', letterSpacing: '-0.02em', textAlign: 'center',
              }}>{t('forgotTitle')}</h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--dark4)', marginBottom: '2rem', textAlign: 'center', lineHeight: 1.5 }}>
                {t('forgotSub')}
              </p>

              {/* Email field */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block', fontFamily: 'var(--f-mono)', fontSize: '0.5625rem', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dark4)', marginBottom: '0.4375rem',
                }}>{t('email')}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark5)' }}>
                    <MailIcon />
                  </span>
                  <input
                    className="field-input-fp"
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
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

              {/* CTA */}
              <button className="btn-primary-fp" onClick={handleSubmit} disabled={loading} style={{
                width: '100%', padding: '0.75rem 1.25rem', borderRadius: '8px',
                fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: '0.875rem',
                cursor: 'pointer', border: 'none', transition: '0.25s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                background: 'var(--teal)', color: '#fff', boxShadow: '0 2px 8px var(--teal-glow)',
              }}>
                {loading ? tc('loading') : t('sendResetLink')}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <CheckCircleIcon />
              </div>
              <h1 className="auth-title-fp" style={{
                fontFamily: 'var(--f-display)', fontSize: '1.5rem', fontWeight: 700,
                color: 'var(--dark)', marginBottom: '0.5rem', letterSpacing: '-0.02em',
              }}>{t('resetSentTitle')}</h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--dark4)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                {t('resetSentHint')}
              </p>

              {/* Resend */}
              <button className="btn-ghost-fp" onClick={handleResend} disabled={cooldown > 0 || loading} style={{
                background: 'none', color: cooldown > 0 ? 'var(--dark5)' : 'var(--teal)', border: 'none',
                fontSize: '0.8125rem', fontWeight: 600, cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                transition: '0.2s', fontFamily: 'var(--f-body)', padding: '0.5rem',
              }}>
                {cooldown > 0 ? `${t('resendLink')} (${cooldown}s)` : t('didntReceive')}
              </button>
            </div>
          )}

          {/* Back to sign in */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link href={`/${locale}/auth/login`} style={{
              fontSize: '0.8125rem', color: 'var(--dark4)', textDecoration: 'none', fontWeight: 500,
            }}>
              {t('backToSignIn')}
            </Link>
          </div>
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
      </div>
    </>
  );
}
