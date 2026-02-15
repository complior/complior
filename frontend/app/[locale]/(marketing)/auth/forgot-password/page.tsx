'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { createRecoveryFlow, submitRecovery, extractCsrfToken } from '@/lib/ory';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [resent, setResent] = useState(false);
  const resendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setLoading(true);
    try {
      const flow = await createRecoveryFlow();
      await submitRecovery(flow.id, { method: 'link', csrf_token: extractCsrfToken(flow), email });
      setSent(true);
    } catch {
      // Always show success (security-conscious)
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const flow = await createRecoveryFlow();
      await submitRecovery(flow.id, { method: 'link', csrf_token: extractCsrfToken(flow), email });
    } catch {
      // Silently fail
    }
    setResent(true);
    if (resendTimerRef.current) clearTimeout(resendTimerRef.current);
    resendTimerRef.current = setTimeout(() => setResent(false), 2500);
  };

  const handleEmailInput = (value: string) => {
    setEmail(value);
    if (emailError) setEmailError(false);
  };

  return (
    <>
      <style jsx>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
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

      <div
        style={{
          minHeight: 'calc(100vh - 56px)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Auth Card */}
        <div
          className="auth-card"
          style={{
            maxWidth: 420,
            width: '100%',
            padding: '2.5rem',
            borderRadius: 14,
            border: '1px solid var(--b2)',
            background: 'var(--card)',
            boxShadow: '0 16px 48px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.03)',
            animation: 'cardIn 0.5s ease both',
          }}
        >
          {!sent ? (
            /* ═══ STATE 1: Enter Email Form ═══ */
            <>
              {/* Lock Icon */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: 'var(--teal-dim)',
                  border: '1px solid var(--teal-glow)',
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--teal)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>

              {/* Title */}
              <h1
                className="auth-title"
                style={{
                  fontFamily: 'var(--f-display)',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'var(--dark)',
                  marginBottom: '0.375rem',
                  letterSpacing: '-0.02em',
                }}
              >
                {t('forgotTitle')}
              </h1>

              {/* Subtitle */}
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--dark4)',
                  marginBottom: '2rem',
                  lineHeight: 1.6,
                }}
              >
                {t('forgotSub')}
              </p>

              <form onSubmit={handleSubmit}>
                {/* Email Field */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="resetEmail"
                    style={{
                      display: 'block',
                      fontFamily: 'var(--f-mono)',
                      fontSize: '0.5625rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--dark4)',
                      marginBottom: '0.4375rem',
                    }}
                  >
                    {t('email')}
                  </label>
                  <input
                    id="resetEmail"
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    autoComplete="email"
                    value={email}
                    onChange={(e) => handleEmailInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6875rem 0.875rem',
                      border: `1.5px solid ${emailError ? 'var(--coral)' : 'var(--b2)'}`,
                      borderRadius: 8,
                      fontFamily: 'var(--f-body)',
                      fontSize: '0.875rem',
                      color: 'var(--dark)',
                      background: 'var(--bg)',
                      outline: 'none',
                      transition: 'border-color 0.25s, box-shadow 0.25s',
                      boxShadow: emailError
                        ? '0 0 0 3px rgba(231,76,60,.06)'
                        : 'none',
                    }}
                    onFocus={(e) => {
                      if (!emailError) {
                        e.currentTarget.style.borderColor = 'var(--teal)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px var(--teal-dim)';
                      }
                    }}
                    onBlur={(e) => {
                      if (!emailError) {
                        e.currentTarget.style.borderColor = 'var(--b2)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  />
                  {emailError && (
                    <div
                      style={{
                        fontSize: '0.6875rem',
                        color: 'var(--coral)',
                        marginTop: '0.3125rem',
                      }}
                    >
                      {t('emailError')}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1.25rem',
                    borderRadius: 8,
                    fontFamily: 'var(--f-body)',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: loading ? 'default' : 'pointer',
                    border: 'none',
                    background: 'var(--teal)',
                    color: '#fff',
                    boxShadow: '0 2px 8px var(--teal-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: '0.25s',
                    opacity: loading ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = 'var(--teal2)';
                      e.currentTarget.style.boxShadow = '0 4px 16px var(--teal-glow)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--teal)';
                    e.currentTarget.style.boxShadow = '0 2px 8px var(--teal-glow)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  {t('sendResetLink')}
                </button>
              </form>
            </>
          ) : (
            /* ═══ STATE 2: Sent Confirmation ═══ */
            <div style={{ textAlign: 'center' }}>
              {/* Checkmark Icon */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: 'var(--teal-dim)',
                  border: '1px solid var(--teal-glow)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 1.25rem',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--teal)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontFamily: 'var(--f-display)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--dark)',
                  marginBottom: '0.375rem',
                }}
              >
                {t('resetSentTitle')}
              </h2>

              {/* Email display */}
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--teal)',
                  marginBottom: '1.25rem',
                  wordBreak: 'break-all',
                }}
              >
                {email}
              </div>

              {/* Hint text */}
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--dark4)',
                  marginBottom: '1.5rem',
                  lineHeight: 1.6,
                }}
              >
                {t('resetSentHint')}
              </p>

              {/* Resend button */}
              <button
                onClick={handleResend}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resent ? 'var(--green)' : 'var(--teal)',
                  fontFamily: 'var(--f-body)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: '0.2s',
                }}
              >
                {resent ? t('resent') : t('didntReceive')}
              </button>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
          <Link
            href={`/${locale}/auth/login`}
            style={{
              color: 'var(--teal)',
              fontWeight: 600,
              fontSize: '0.8125rem',
              textDecoration: 'none',
              transition: '0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none';
            }}
          >
            {t('backToSignIn')}
          </Link>
        </div>
      </div>
    </>
  );
}
