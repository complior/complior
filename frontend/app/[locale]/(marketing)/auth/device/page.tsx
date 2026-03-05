'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function DevicePage() {
  const t = useTranslations('device');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setStatus('loading');
    setError(null);
    try {
      await api.auth.confirmDevice(code);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm');
      setStatus('error');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--b2)] bg-[var(--bg)] p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--dark)]">{t('title')}</h1>
        <p className="mt-2 text-sm text-[var(--dark5)]">{t('subtitle')}</p>

        {status === 'success' ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-800">{t('success')}</p>
            <p className="mt-1 text-xs text-emerald-600">{t('successHint')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-[var(--dark3)]">
                {t('codeLabel')}
              </label>
              <input
                id="code"
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="ABC123"
                className="mt-1 w-full rounded-lg border border-[var(--b2)] bg-[var(--bg)] px-4 py-3 text-center text-2xl font-mono tracking-widest text-[var(--dark)] focus:border-[var(--teal)] focus:outline-none"
                autoFocus
              />
            </div>
            {error && (
              <div className="rounded-lg border border-[var(--coral)] bg-[var(--coral-dim)] p-3">
                <p className="text-sm text-[var(--coral)]">{error}</p>
              </div>
            )}
            <Button type="submit" disabled={code.length !== 6 || status === 'loading'} className="w-full">
              {status === 'loading' ? t('confirming') : t('confirm')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
