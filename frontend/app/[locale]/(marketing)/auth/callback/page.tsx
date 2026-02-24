'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { getSession } from '@/lib/auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);

  const getRedirectPath = () => {
    try {
      const stored = sessionStorage.getItem('oauth_plan');
      if (stored) {
        const state = JSON.parse(stored);
        sessionStorage.removeItem('oauth_plan');
        if (state.plan && state.plan !== 'free') {
          return `/${locale}/auth/register?plan=${state.plan}&period=${state.period || 'monthly'}&step=2`;
        }
      }
    } catch {
      // ignore
    }
    return `/${locale}/dashboard`;
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const user = await getSession();
        if (user?.active) {
          router.replace(getRedirectPath());
        } else {
          await new Promise((r) => setTimeout(r, 1000));
          const retry = await getSession();
          if (retry?.active) {
            router.replace(getRedirectPath());
          } else {
            router.replace(`/${locale}/auth/login`);
          }
        }
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
