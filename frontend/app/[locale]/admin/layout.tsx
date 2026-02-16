'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { api, UserProfile } from '@/lib/api';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.me()
      .then((user: UserProfile) => {
        if (user.roles?.includes('platform_admin')) {
          setAuthorized(true);
        } else {
          router.replace(`/${locale}/dashboard`);
        }
      })
      .catch(() => {
        router.replace(`/${locale}/auth/login`);
      })
      .finally(() => setLoading(false));
  }, [router, locale]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="text-[var(--dark4)] font-mono text-sm">Loading...</div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <Header mode="admin" />
      <main className="flex-1 pt-14">{children}</main>
      <footer className="border-t border-[var(--b)] py-4 text-center font-mono text-[0.5625rem] text-[var(--dark5)]">
        Complior.ai Admin
      </footer>
    </div>
  );
}
