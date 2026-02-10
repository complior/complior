'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { LoginForm } from '@/components/auth/LoginForm';
import { MagicLinkSent } from '@/components/auth/MagicLinkSent';
import { getSession, createLoginFlow, submitLogin } from '@/lib/ory';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getSession().then((session) => {
      if (session?.active) {
        router.replace('/dashboard');
      } else {
        setCheckingSession(false);
      }
    });
  }, [router]);

  const handlePasswordLogin = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const flow = await createLoginFlow();
      const result = await submitLogin(flow.id, {
        method: 'password',
        identifier: email,
        password,
      });
      if (result.session) {
        await api.auth.me();
        router.push('/dashboard');
      } else if (result.error) {
        setError(result.error.message || 'Anmeldung fehlgeschlagen');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const flow = await createLoginFlow();
      await submitLogin(flow.id, {
        method: 'code',
        identifier: email,
      });
      setMagicLinkEmail(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Senden des Magic Links');
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

  if (magicLinkEmail) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <MagicLinkSent email={magicLinkEmail} onBack={() => setMagicLinkEmail(null)} />
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
          <CardTitle>Anmelden</CardTitle>
          <CardDescription>
            Melden Sie sich bei Ihrem AI Act Compliance Konto an
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm
            onSubmitPassword={handlePasswordLogin}
            onSubmitMagicLink={handleMagicLink}
            error={error}
            loading={loading}
          />
          <p className="mt-4 text-center text-sm text-slate-500">
            Noch kein Konto?{' '}
            <Link href="/auth/register" className="text-primary-600 hover:underline">
              Jetzt registrieren
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
