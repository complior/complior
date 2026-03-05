'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api, type AuditPackage, type PaginatedResponse } from '@/lib/api';

const statusStyles: Record<string, string> = {
  queued: 'bg-blue-100 text-blue-800',
  generating: 'bg-amber-100 text-amber-800',
  ready: 'bg-emerald-100 text-emerald-800',
  error: 'bg-red-100 text-red-800',
  expired: 'bg-slate-100 text-slate-600',
};

export default function AuditPackagePage() {
  const t = useTranslations('auditPackage');
  const [generating, setGenerating] = useState(false);
  const [activePackage, setActivePackage] = useState<AuditPackage | null>(null);
  const [history, setHistory] = useState<PaginatedResponse<AuditPackage> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async (p: number) => {
    try {
      const data = await api.auditPackage.history({ page: String(p), pageSize: '10' });
      setHistory(data);
      // Check if there's an active generating package
      const active = data.data.find((pkg) => pkg.status === 'queued' || pkg.status === 'generating');
      if (active) setActivePackage(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(page); }, [page, fetchHistory]);

  // Poll active package status
  useEffect(() => {
    if (!activePackage || (activePackage.status !== 'queued' && activePackage.status !== 'generating')) return;
    const interval = setInterval(async () => {
      try {
        const status = await api.auditPackage.status(activePackage.auditPackageId);
        setActivePackage(status);
        if (status.status === 'ready' || status.status === 'error') {
          clearInterval(interval);
          fetchHistory(page);
        }
      } catch { /* ignore polling errors */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [activePackage, page, fetchHistory]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await api.auditPackage.generate();
      setActivePackage({ ...result, status: 'queued' } as AuditPackage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const { downloadUrl } = await api.auditPackage.download(id);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download');
    }
  };

  const isGenerating = activePackage?.status === 'queued' || activePackage?.status === 'generating';

  return (
    <div className="mx-auto max-w-ctr px-8 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--dark)]">{t('title')}</h1>
          <p className="mt-1 text-sm text-[var(--dark5)]">{t('subtitle')}</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating || isGenerating}>
          {generating || isGenerating ? t('generating') : t('generateButton')}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-[var(--coral)] bg-[var(--coral-dim)] p-4">
          <p className="text-sm text-[var(--coral)]">{error}</p>
        </div>
      )}

      {/* Active package status */}
      {activePackage && (
        <div className="mb-6 rounded-xl border border-[var(--b2)] bg-[var(--card)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--dark3)]">{t('statusLabel')}</p>
              <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[activePackage.status]}`}>
                {t(`status.${activePackage.status}`)}
              </span>
            </div>
            {activePackage.status === 'ready' && (
              <Button onClick={() => handleDownload(activePackage.auditPackageId)}>
                {t('download')}
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-[var(--dark5)]">
            {activePackage.status === 'queued' || activePackage.status === 'generating'
              ? t('generatingMessage')
              : activePackage.status === 'ready'
              ? t('readyMessage')
              : activePackage.status === 'error'
              ? t('errorMessage')
              : ''}
          </p>
          {activePackage.status === 'ready' && (
            <p className="mt-1 text-xs text-[var(--dark5)]">{t('downloadHint')}</p>
          )}
        </div>
      )}

      {/* History table */}
      <div className="rounded-xl border border-[var(--b2)] bg-[var(--card)]">
        <div className="border-b border-[var(--b2)] px-6 py-4">
          <h2 className="font-semibold text-[var(--dark)]">{t('history')}</h2>
        </div>

        {loading && !history ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--bg2)]" />
            ))}
          </div>
        ) : history && history.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--b2)] text-left text-xs text-[var(--dark5)]">
                    <th className="px-6 py-3">{t('colDate')}</th>
                    <th className="px-6 py-3">{t('colStatus')}</th>
                    <th className="px-6 py-3">{t('colTools')}</th>
                    <th className="px-6 py-3">{t('colDocs')}</th>
                    <th className="px-6 py-3">{t('colSize')}</th>
                    <th className="px-6 py-3">{t('colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.map((pkg) => (
                    <tr key={pkg.auditPackageId} className="border-b border-[var(--b2)] last:border-0">
                      <td className="px-6 py-3 text-[var(--dark3)]">
                        {new Date(pkg.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles[pkg.status]}`}>
                          {t(`status.${pkg.status}`)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-[var(--dark4)]">{pkg.toolCount}</td>
                      <td className="px-6 py-3 text-[var(--dark4)]">{pkg.documentCount}</td>
                      <td className="px-6 py-3 text-[var(--dark4)]">
                        {pkg.fileSize ? t('fileSize', { size: String((pkg.fileSize / 1024 / 1024).toFixed(1)) }) : '—'}
                      </td>
                      <td className="px-6 py-3">
                        {pkg.status === 'ready' && (
                          <Button variant="secondary" size="sm" onClick={() => handleDownload(pkg.auditPackageId)}>
                            {t('download')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {history.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 border-t border-[var(--b2)] px-6 py-4">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  {t('prevPage')}
                </Button>
                <span className="text-sm text-[var(--dark4)]">
                  {t('pageOf', { page: String(page), total: String(history.pagination.totalPages) })}
                </span>
                <Button variant="secondary" size="sm" disabled={page >= history.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                  {t('nextPage')}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="px-6 py-12 text-center text-sm text-[var(--dark5)]">
            {t('historyEmpty')}
          </div>
        )}
      </div>
    </div>
  );
}
