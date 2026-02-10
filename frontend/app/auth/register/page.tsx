'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { RegisterStep1 } from '@/components/auth/RegisterStep1';
import { RegisterStep2 } from '@/components/auth/RegisterStep2';
import { getSession, createRegistrationFlow, submitRegistration } from '@/lib/ory';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [userProfile, setUserProfile] = useState<{ organizationId: number } | null>(null);

  useEffect(() => {
    getSession().then((session) => {
      if (session?.active) {
        // Already logged in — check if org setup needed
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
        // Registration successful — webhook should fire
        // Fetch user profile from our backend
        const profile = await api.auth.me();
        setUserProfile(profile);
        setStep(2);
      } else if (result.error) {
        setError(result.error.message || 'Registrierung fehlgeschlagen');
      } else if (result.ui?.messages) {
        const msgs = result.ui.messages.map((m: { text: string }) => m.text).join('. ');
        setError(msgs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen');
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
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-slate-500">Wird geladen...</p>
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
          <CardTitle>
            {step === 1 ? 'Konto erstellen' : 'Unternehmen einrichten'}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? 'Erstellen Sie Ihr AI Act Compliance Konto'
              : 'Schritt 2 von 2 — Unternehmensdaten'}
          </CardDescription>
          {/* Step indicator */}
          <div className="flex justify-center gap-2 pt-2">
            <div className={`h-1.5 w-8 rounded-full ${step >= 1 ? 'bg-primary-600' : 'bg-slate-200'}`} />
            <div className={`h-1.5 w-8 rounded-full ${step >= 2 ? 'bg-primary-600' : 'bg-slate-200'}`} />
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <>
              <RegisterStep1
                onSubmit={handleStep1}
                error={error}
                loading={loading}
              />
              <p className="mt-4 text-center text-sm text-slate-500">
                Bereits ein Konto?{' '}
                <Link href="/auth/login" className="text-primary-600 hover:underline">
                  Anmelden
                </Link>
              </p>
            </>
          ) : (
            <RegisterStep2
              onSubmit={handleStep2}
              onSkip={() => router.push('/dashboard')}
              error={error}
              loading={loading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
