'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { verifyMagicLink, sendMagicLink } from '@/lib/auth';

const ShieldCheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="M9 12l2 2 4-4" />
  </svg>
);

function VerifyCodeContent() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError(null);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (digit && index === 5) {
      const code = newDigits.join('');
      if (code.length === 6) {
        handleSubmit(code);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    setError(null);

    // Focus the next empty or last input
    const nextEmpty = newDigits.findIndex(d => !d);
    inputRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();

    // Auto-submit if 6 digits pasted
    if (pasted.length === 6) {
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (code?: string) => {
    const finalCode = code || digits.join('');
    if (finalCode.length !== 6) return;

    setLoading(true);
    setError(null);
    try {
      const result = await verifyMagicLink(email, finalCode);
      if (result.success) {
        router.push(`/${locale}/dashboard`);
      } else {
        setError(t('invalidCode'));
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError(t('invalidCode'));
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    try {
      await sendMagicLink(email);
      setCooldown(60);
    } catch {
      // silent
    }
  };

  if (!email) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--dark4)', marginBottom: '1rem' }}>No email address provided.</p>
          <Link href={`/${locale}/auth/login`} style={{ color: 'var(--teal)', fontWeight: 600 }}>
            {t('backToSignIn')}
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
        .digit-input:focus {
          border-color: var(--teal) !important;
          box-shadow: 0 0 0 3px var(--teal-dim) !important;
        }
        .btn-ghost-vc:hover { color: var(--teal) !important; }
        @media (max-width: 480px) {
          .auth-card-vc { padding: 2rem 1.5rem !important; border-radius: 12px !important; }
          .digit-input { width: 40px !important; height: 48px !important; font-size: 1.25rem !important; }
        }
      `}</style>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 56px)', padding: '2rem',
      }}>
        <div className="auth-card-vc" style={{
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

          <h1 style={{
            fontFamily: 'var(--f-display)', fontSize: '1.5rem', fontWeight: 700,
            color: 'var(--dark)', marginBottom: '0.375rem', letterSpacing: '-0.02em', textAlign: 'center',
          }}>{t('enterCode')}</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--dark4)', marginBottom: '2rem', textAlign: 'center', lineHeight: 1.5 }}>
            {t('codeSubtitle')} <strong style={{ color: 'var(--dark)' }}>{email}</strong>
          </p>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: '1rem', borderRadius: '8px', border: '1px solid var(--coral)',
              background: 'var(--coral-dim)', padding: '0.625rem 0.875rem', textAlign: 'center',
            }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--coral)', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* 6-digit input boxes */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem',
          }}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                className="digit-input"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                disabled={loading}
                style={{
                  width: '48px', height: '56px', textAlign: 'center',
                  fontFamily: 'var(--f-mono)', fontSize: '1.5rem', fontWeight: 700,
                  color: 'var(--dark)', border: '1.5px solid var(--b2)', borderRadius: '10px',
                  background: 'var(--bg)', outline: 'none', transition: 'border-color .25s, box-shadow .25s',
                  caretColor: 'var(--teal)',
                }}
              />
            ))}
          </div>

          {/* Loading indicator */}
          {loading && (
            <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--dark5)', marginBottom: '1rem' }}>
              {tc('loading')}
            </p>
          )}

          {/* Resend */}
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <button className="btn-ghost-vc" onClick={handleResend} disabled={cooldown > 0} style={{
              background: 'none', border: 'none', fontSize: '0.8125rem',
              color: cooldown > 0 ? 'var(--dark5)' : 'var(--teal)',
              fontWeight: 600, cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--f-body)', transition: '0.2s', padding: '0.5rem',
            }}>
              {cooldown > 0 ? `${t('resendLink')} (${cooldown}s)` : t('didntReceive')}
            </button>
          </div>

          {/* Back */}
          <div style={{ textAlign: 'center' }}>
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

export default function VerifyCodePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--dark5)' }}>Loading...</p>
      </div>
    }>
      <VerifyCodeContent />
    </Suspense>
  );
}
