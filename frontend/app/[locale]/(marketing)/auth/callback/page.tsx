'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { getSession } from '@/lib/auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // The backend /api/auth/callback sets the wos-session cookie and redirects.
        // If we land here, the cookie should already be set.
        // Verify the session and redirect to dashboard.
        const user = await getSession();
        if (user?.active) {
          router.replace(`/${locale}/dashboard`);
        } else {
          // Session not yet available — retry once after a short delay
          await new Promise((r) => setTimeout(r, 1000));
          const retry = await getSession();
          if (retry?.active) {
            router.replace(`/${locale}/dashboard`);
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
