'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RegisterStep1 } from '@/components/auth/RegisterStep1';
import { RegisterStep2 } from '@/components/auth/RegisterStep2';
import { TrialConfirmation } from '@/components/auth/TrialConfirmation';
import { getSession, createRegistrationFlow, submitRegistration } from '@/lib/ory';
import { api } from '@/lib/api';

const PAID_PLANS = ['starter', 'growth', 'scale'];

function getPlanDisplayName(name: string): string {
  const map: Record<string, string> = {
    free: 'Free',
    starter: 'Starter',
    growth: 'Growth',
    scale: 'Scale',
  };
  return map[name] || name;
}

export default function RegisterPage() {
  const router = useRouter();
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
          router.replace('/dashboard');
        });
      } else {
        setCheckingSession(false);
      }
    });
  }, [router]);

  const handleStep1 = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const flow = await createRegistrationFlow();
      const result = await submitRegistration(flow.id, {
        method: 'password',
        traits: {
          email: data.email,
          name: { first: data.firstName, last: data.lastName },
        },
        password: data.password,
      });

      if (result.identity) {
        const profile = await api.auth.me();
        setUserProfile(profile);
        setStep(2);
      } else if (result.error) {
        setError(result.error.message || 'Registration failed');
      } else if (result.ui?.messages) {
        const msgs = result.ui.messages.map((m: { text: string }) => m.text).join('. ');
        setError(msgs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (data: {
    companyName: string;
    industry: string;
    size: string;
    country: string;
  }) => {
    if (!userProfile) return;
    setLoading(true);
    setError(null);
    try {
      await api.auth.updateOrganization(userProfile.organizationId, {
        name: data.companyName,
        industry: data.industry,
        size: data.size,
        country: data.country,
      });
      if (isPaid) {
        setStep(3);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles: Record<number, string> = {
    1: 'Create Account',
    2: 'Set Up Company',
    3: 'Start Your Trial',
  };

  const stepDescriptions: Record<number, string> = {
    1: 'Create your AI Act Compliance account',
    2: `Step 2 of ${totalSteps} — Company details`,
    3: `Step 3 of ${totalSteps} — Confirm your plan`,
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Shield className="h-6 w-6 text-primary-600" />
          </div>
          {isPaid && (
            <Badge className="mx-auto mb-2">
              Registering for {getPlanDisplayName(planParam)} plan
            </Badge>
          )}
          <CardTitle>{stepTitles[step]}</CardTitle>
          <CardDescription>{stepDescriptions[step]}</CardDescription>
          {/* Step indicator */}
          <div className="flex justify-center gap-2 pt-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full ${step >= i + 1 ? 'bg-primary-600' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <>
              <RegisterStep1
                onSubmit={handleStep1}
                error={error}
                loading={loading}
              />
              <p className="mt-4 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
          {step === 2 && (
            <RegisterStep2
              onSubmit={handleStep2}
              onSkip={() => {
                if (isPaid) {
                  setStep(3);
                } else {
                  router.push('/dashboard');
                }
              }}
              error={error}
              loading={loading}
            />
          )}
          {step === 3 && isPaid && (
            <TrialConfirmation
              planName={planParam}
              period={periodParam}
              onContinueFree={() => router.push('/dashboard')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
