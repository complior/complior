'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { RegisterStep1 } from '@/components/auth/RegisterStep1';
import { RegisterStep2 } from '@/components/auth/RegisterStep2';
import { TrialConfirmation } from '@/components/auth/TrialConfirmation';
import { getSession, createRegistrationFlow, submitRegistration } from '@/lib/ory';
import { api } from '@/lib/api';

const PAID_PLANS = ['starter', 'growth', 'scale'];

function RegisterContent() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth');
  const searchParams = useSearchParams();

  const planParam = searchParams.get('plan') || 'free';
  const periodParam = (searchParams.get('period') || 'monthly') as 'monthly' | 'yearly';
  const isPaid = PAID_PLANS.includes(planParam);
  const totalSteps = isPaid ? 3 : 2;

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [userProfile, setUserProfile] = useState<{ organizationId: number } | null>(null);

  useEffect(() => {
    getSession().then((session) => {
      if (session?.active) {
        api.auth.me().then((profile) => {
          setUserProfile(profile);
          setStep(2);
          setCheckingSession(false);
        }).catch(() => {
          router.replace(`/${locale}/dashboard`);
        });
      } else {
        setCheckingSession(false);
      }
    });
  }, [router, locale]);

  const handleStep1 = async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const flow = await createRegistrationFlow();
      const result = await submitRegistration(flow.id, {
        method: 'password',
        traits: { email: data.email, name: { first: data.firstName, last: data.lastName } },
        password: data.password,
      });
      if (result.identity) {
        const profile = await api.auth.me();
        setUserProfile(profile);
        setStep(2);
      } else if (result.error) {
        setError(result.error.message || 'Registration failed');
      } else if (result.ui?.messages) {
        setError(result.ui.messages.map((m: { text: string }) => m.text).join('. '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (data: { companyName: string; industry: string; size: string; country: string }) => {
    if (!userProfile) return;
    setLoading(true);
    setError(null);
    try {
      await api.auth.updateOrganization(userProfile.organizationId, {
        name: data.companyName, industry: data.industry, size: data.size, country: data.country,
      });
      if (isPaid) {
        setStep(3);
      } else {
        router.push(`/${locale}/dashboard`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
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

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-[460px]" style={{ animation: 'cardIn 0.5s ease forwards' }}>
        <div className="rounded-2xl border border-[var(--b2)] bg-[var(--card)] p-8 shadow-sm">
          {/* Progress Stepper */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold ${
                  step > i + 1 ? 'bg-teal text-white' : step === i + 1 ? 'bg-teal text-white' : 'border border-[var(--b3)] text-[var(--dark5)]'
                }`}>
                  {step > i + 1 ? '\u2713' : i + 1}
                </div>
                {i < totalSteps - 1 && <div className={`h-px w-8 ${step > i + 1 ? 'bg-teal' : 'bg-[var(--b2)]'}`} />}
              </div>
            ))}
          </div>

          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-bold text-[var(--dark)] mb-1">
              {step === 1 ? t('createAccount') : step === 2 ? t('companyInfo') : t('trialConfirmation')}
            </h1>
            <p className="text-sm text-[var(--dark5)]">
              {step === 1 ? t('createAccountSub') : step === 2 ? t('companyInfoSub') : t('trialConfirmationSub')}
            </p>
          </div>

          {isPaid && step === 1 && (
            <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-[var(--teal-dim)] px-3 py-2">
              <span className="font-mono text-[0.625rem] font-bold text-teal uppercase">
                {planParam} Plan
              </span>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-[var(--coral)] bg-[var(--coral-dim)] px-4 py-3">
              <p className="text-sm text-[var(--coral)]">{error}</p>
            </div>
          )}

          {step === 1 && (
            <>
              <RegisterStep1 onSubmit={handleStep1} error={error} loading={loading} />
              <p className="mt-6 text-center text-xs text-[var(--dark5)]">
                {t('hasAccount')}{' '}
                <Link href={`/${locale}/auth/login`} className="font-semibold text-teal hover:underline">
                  {t('signInLink')}
                </Link>
              </p>
            </>
          )}
          {step === 2 && (
            <RegisterStep2 onSubmit={handleStep2} onSkip={() => { if (isPaid) setStep(3); else router.push(`/${locale}/dashboard`); }} error={error} loading={loading} />
          )}
          {step === 3 && isPaid && (
            <TrialConfirmation planName={planParam} period={periodParam} onContinueFree={() => router.push(`/${locale}/dashboard`)} />
          )}

          {/* Trust Line */}
          <div className="mt-6 flex items-center justify-center gap-2 text-[0.625rem] text-[var(--dark5)]">
            <svg className="h-3 w-3 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            {t('trustLine')}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center"><p className="text-[var(--dark5)]">Loading...</p></div>}>
      <RegisterContent />
    </Suspense>
  );
}
