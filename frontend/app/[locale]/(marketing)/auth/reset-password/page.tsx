'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { resetPassword } from '@/lib/auth';

const ShieldCheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="M9 12l2 2 4-4" />
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
  </svg>
);

function ResetPasswordContent() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const getPasswordStrength = (pw: string): { level: number; label: string; color: string } => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: score, label: t('pwWeak'), color: 'var(--coral)' };
    if (score <= 2) return { level: score, label: t('pwMedium'), color: '#f0ad4e' };
    return { level: score, label: t('pwStrong'), color: 'var(--teal)' };
  };
  const pwStrength = getPasswordStrength(password);

  const handleSubmit = async () => {
    setPasswordError(false);
    setConfirmError(false);
    setError(null);

    if (password.length < 8) { setPasswordError(true); return; }
    if (password !== confirmPassword) { setConfirmError(true); return; }

    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => router.push(`/${locale}/auth/login`), 3000);
      } else {
        setError(t('invalidToken'));
      }
    } catch {
      setError(t('invalidToken'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--dark4)', marginBottom: '1rem' }}>{t('invalidToken')}</p>
          <Link href={`/${locale}/auth/forgot-password`} style={{ color: 'var(--teal)', fontWeight: 600 }}>
            {t('sendResetLink')}
          </Link>
        </div>
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
        .field-input-rp:focus {
          border-color: var(--teal) !important;
          box-shadow: 0 0 0 3px var(--teal-dim) !important;
        }
        .field-input-rp::placeholder { color: var(--dark5); }
        .btn-primary-rp:hover {
          background: var(--teal2) !important;
          box-shadow: 0 4px 16px var(--teal-glow) !important;
          transform: translateY(-1px);
        }
        .btn-primary-rp:active { transform: translateY(0); }
        .btn-primary-rp:disabled { opacity: 0.7; cursor: not-allowed; transform: none !important; }
        @media (max-width: 480px) {
          .auth-card-rp { padding: 2rem 1.5rem !important; border-radius: 12px !important; }
          .auth-title-rp { font-size: 1.25rem !important; }
        }
      `}</style>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 56px)', padding: '2rem',
      }}>
        <div className="auth-card-rp" style={{
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

          {!success ? (
            <>
              <h1 className="auth-title-rp" style={{
                fontFamily: 'var(--f-display)', fontSize: '1.5rem', fontWeight: 700,
                color: 'var(--dark)', marginBottom: '0.375rem', letterSpacing: '-0.02em', textAlign: 'center',
              }}>{t('setNewPassword')}</h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--dark4)', marginBottom: '2rem', textAlign: 'center' }}>
                {t('passwordMin')}
              </p>

              {/* Error */}
              {error && (
                <div style={{
                  marginBottom: '1rem', borderRadius: '8px', border: '1px solid var(--coral)',
                  background: 'var(--coral-dim)', padding: '0.625rem 0.875rem',
                }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--coral)', margin: 0 }}>{error}</p>
                </div>
              )}

              {/* New password */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block', fontFamily: 'var(--f-mono)', fontSize: '0.5625rem', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dark4)', marginBottom: '0.4375rem',
                }}>{t('newPassword')}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark5)' }}>
                    <LockIcon />
                  </span>
                  <input
                    className="field-input-rp"
                    type="password"
                    placeholder={t('passwordMin')}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(false); setError(null); }}
                    style={{
                      width: '100%', padding: '0.6875rem 0.875rem 0.6875rem 2.5rem',
                      border: `1.5px solid ${passwordError ? 'var(--coral)' : 'var(--b2)'}`, borderRadius: '8px',
                      fontFamily: 'var(--f-body)', fontSize: '0.875rem', color: 'var(--dark)',
                      background: 'var(--bg)', outline: 'none', transition: 'border-color .25s, box-shadow .25s',
                    }}
                  />
                </div>
                {passwordError && <div style={{ fontSize: '0.6875rem', color: 'var(--coral)', marginTop: '0.3125rem' }}>{t('pwMinError')}</div>}
                {/* Strength meter */}
                {password && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '0.25rem' }}>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} style={{
                          flex: 1, height: '3px', borderRadius: '2px',
                          background: i <= pwStrength.level ? pwStrength.color : 'var(--b2)',
                          transition: '0.3s',
                        }} />
                      ))}
                    </div>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: '0.5rem', color: pwStrength.color, letterSpacing: '0.04em' }}>
                      {t('passwordStrength')}: {pwStrength.label}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block', fontFamily: 'var(--f-mono)', fontSize: '0.5625rem', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dark4)', marginBottom: '0.4375rem',
                }}>{t('confirmPassword')}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark5)' }}>
                    <LockIcon />
                  </span>
                  <input
                    className="field-input-rp"
                    type="password"
                    placeholder={t('confirmPassword')}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                    style={{
                      width: '100%', padding: '0.6875rem 0.875rem 0.6875rem 2.5rem',
                      border: `1.5px solid ${confirmError ? 'var(--coral)' : 'var(--b2)'}`, borderRadius: '8px',
                      fontFamily: 'var(--f-body)', fontSize: '0.875rem', color: 'var(--dark)',
                      background: 'var(--bg)', outline: 'none', transition: 'border-color .25s, box-shadow .25s',
                    }}
                  />
                </div>
                {confirmError && <div style={{ fontSize: '0.6875rem', color: 'var(--coral)', marginTop: '0.3125rem' }}>{t('passwordsDontMatch')}</div>}
              </div>

              {/* CTA */}
              <button className="btn-primary-rp" onClick={handleSubmit} disabled={loading} style={{
                width: '100%', padding: '0.75rem 1.25rem', borderRadius: '8px',
                fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: '0.875rem',
                cursor: 'pointer', border: 'none', transition: '0.25s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                background: 'var(--teal)', color: '#fff', boxShadow: '0 2px 8px var(--teal-glow)',
              }}>
                {loading ? tc('loading') : t('passwordReset')}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <CheckCircleIcon />
              </div>
              <h1 style={{
                fontFamily: 'var(--f-display)', fontSize: '1.5rem', fontWeight: 700,
                color: 'var(--dark)', marginBottom: '0.5rem', letterSpacing: '-0.02em',
              }}>{t('passwordResetSuccess')}</h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--dark4)', lineHeight: 1.5 }}>
                Redirecting to sign in...
              </p>
            </div>
          )}

          {/* Back */}
          {!success && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link href={`/${locale}/auth/login`} style={{
                fontSize: '0.8125rem', color: 'var(--dark4)', textDecoration: 'none', fontWeight: 500,
              }}>
                {t('backToSignIn')}
              </Link>
            </div>
          )}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--dark5)' }}>Loading...</p>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
