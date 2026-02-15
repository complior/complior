'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createRecoveryFlow, submitRecovery } from '@/lib/ory';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const flow = await createRecoveryFlow();
      await submitRecovery(flow.id, { method: 'code', email });
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
      await submitRecovery(flow.id, { method: 'code', email });
      setResent(true);
      setTimeout(() => setResent(false), 2500);
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-[420px]" style={{ animation: 'cardIn 0.5s ease forwards' }}>
        <div className="rounded-2xl border border-[var(--b2)] bg-[var(--card)] p-8 shadow-sm">
          {/* Lock icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--teal-dim)]">
            <svg className="h-6 w-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {!sent ? (
            <>
              <div className="text-center mb-6">
                <h1 className="font-display text-2xl font-bold text-[var(--dark)] mb-1">{t('forgotTitle')}</h1>
                <p className="text-sm text-[var(--dark5)]">{t('forgotSub')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block font-mono text-[0.5rem] font-semibold uppercase tracking-[0.12em] text-[var(--dark3)]">
                    {t('email')}
                  </label>
                  <Input
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '...' : t('sendResetLink')}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <h2 className="font-display text-xl font-bold text-[var(--dark)] mb-2">{t('resetSentTitle')}</h2>
              <p className="text-sm text-[var(--dark5)] mb-4">{t('resetSentHint')}</p>
              <p className="text-xs text-[var(--dark5)]">
                {t('didntReceive')}{' '}
                <button onClick={handleResend} className="font-semibold text-teal hover:underline">
                  {resent ? t('resent') : t('resendLink')}
                </button>
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link href={`/${locale}/auth/login`} className="text-xs font-semibold text-teal hover:underline">
              {t('backToSignIn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
