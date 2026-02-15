'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { getSession } from '@/lib/ory';
import { api } from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const session = await getSession();
        if (!session?.active) {
          router.replace(`/${locale}/auth/login`);
          return;
        }
        await api.auth.me();
        router.replace(`/${locale}/dashboard`);
      } catch {
        setError('Authentication failed. Please try again.');
      }
    };
    handleCallback();
  }, [router, locale]);

  if (error) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-[var(--coral)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <p className="text-[var(--dark5)]">Processing authentication...</p>
    </div>
  );
}
