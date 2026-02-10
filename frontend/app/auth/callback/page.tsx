'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/ory';
import { api } from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const session = await getSession();
        if (!session?.active) {
          router.replace('/auth/login');
          return;
        }
        // Sync user to our backend
        await api.auth.me();
        router.replace('/dashboard');
      } catch {
        setError('Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
      }
    };
    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <p className="text-slate-500">Authentifizierung wird verarbeitet...</p>
    </div>
  );
}
