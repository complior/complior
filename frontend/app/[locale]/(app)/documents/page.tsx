'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { DocumentsTable } from '@/components/documents/DocumentsTable';
import { api, type DocumentListItem, type PaginatedResponse } from '@/lib/api';

const DOCUMENT_STATUSES = ['draft', 'generating', 'review', 'approved', 'archived'] as const;
const DOCUMENT_TYPES = ['usage_policy', 'qms_template', 'risk_assessment', 'monitoring_plan', 'employee_notification'] as const;

export default function DocumentsPage() {
  const t = useTranslations('documents');
  const [result, setResult] = useState<PaginatedResponse<DocumentListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [page, setPage] = useState(1);

  const fetchDocuments = useCallback(async (s: string, dt: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.documents.list({
        status: s,
        documentType: dt,
        page: String(p),
        pageSize: '20',
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments(status, documentType, page);
  }, [status, documentType, page, fetchDocuments]);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
  }, []);

  const handleTypeChange = useCallback((value: string) => {
    setDocumentType(value);
    setPage(1);
  }, []);

  return (
    <div className="mx-auto max-w-ctr px-8 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--dark)]">{t('title')}</h1>
          <p className="mt-1 text-sm text-[var(--dark5)]">
            {result
              ? t('indexSubtitle', { count: String(result.pagination.total) })
              : t('subtitle')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-lg border border-[var(--b2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--dark3)] focus:outline-none focus:border-[var(--teal)]"
        >
          <option value="">{t('filterAllStatuses')}</option>
          {DOCUMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`docStatus.${s}`)}</option>
          ))}
        </select>
        <select
          value={documentType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="rounded-lg border border-[var(--b2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--dark3)] focus:outline-none focus:border-[var(--teal)]"
        >
          <option value="">{t('filterAllTypes')}</option>
          {DOCUMENT_TYPES.map((dt) => (
            <option key={dt} value={dt}>{t(`types.${dt}`)}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-[var(--coral)] bg-[var(--coral-dim)] p-4">
          <p className="text-sm text-[var(--coral)]">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !result ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-[var(--b2)] bg-[var(--bg2)]" />
          ))}
        </div>
      ) : result ? (
        <>
          <DocumentsTable documents={result.data} />
          {result.pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {t('prevPage')}
              </Button>
              <span className="text-sm text-[var(--dark4)]">
                {t('pageOf', { page: String(result.pagination.page), total: String(result.pagination.totalPages) })}
              </span>
              <Button variant="secondary" size="sm" disabled={page >= result.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                {t('nextPage')}
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
