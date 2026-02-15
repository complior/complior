'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { LoginForm } from '@/components/auth/LoginForm';
import { MagicLinkSent } from '@/components/auth/MagicLinkSent';
import { getSession, createLoginFlow, submitLogin } from '@/lib/ory';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getSession().then((session) => {
      if (session?.active) {
        router.replace(`/${locale}/dashboard`);
      } else {
        setCheckingSession(false);
      }
    });
  }, [router, locale]);

  const handlePasswordLogin = async (email: string, password: string) => {
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

  const handleMagicLink = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const flow = await createLoginFlow();
      await submitLogin(flow.id, { method: 'code', identifier: email });
      setMagicLinkEmail(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-[var(--dark5)]">Loading...</p>
      </div>
    );
  }

  if (magicLinkEmail) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <MagicLinkSent email={magicLinkEmail} onBack={() => setMagicLinkEmail(null)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-[420px]" style={{ animation: 'cardIn 0.5s ease forwards' }}>
        <div className="rounded-2xl border border-[var(--b2)] bg-[var(--card)] p-8 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-bold text-[var(--dark)] mb-1">{t('welcomeBack')}</h1>
            <p className="text-sm text-[var(--dark5)]">{t('signInSubtitle')}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-[var(--coral)] bg-[var(--coral-dim)] px-4 py-3">
              <p className="text-sm text-[var(--coral)]">{error}</p>
            </div>
          )}

          <LoginForm
            onSubmitPassword={handlePasswordLogin}
            onSubmitMagicLink={handleMagicLink}
            error={error}
            loading={loading}
          />

          <p className="mt-6 text-center text-xs text-[var(--dark5)]">
            {t('noAccount')}{' '}
            <Link href={`/${locale}/auth/register`} className="font-semibold text-teal hover:underline">
              {t('createOne')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
