'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { CatalogSearch } from '@/components/tools/CatalogSearch';
import { CatalogCard } from '@/components/tools/CatalogCard';
import { CatalogDetailDialog } from '@/components/tools/CatalogDetailDialog';
import { Button } from '@/components/ui/Button';
import { api, type CatalogTool, type PaginatedResponse } from '@/lib/api';

export default function CatalogPage() {
  const locale = useLocale();
  const t = useTranslations('wizard');
  const [result, setResult] = useState<PaginatedResponse<CatalogTool> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<CatalogTool | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useState({ q: '', category: '', riskLevel: '' });
  const [page, setPage] = useState(1);

  const fetchCatalog = useCallback(async (params: typeof searchParams, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.catalog.search({
        q: params.q,
        category: params.category,
        riskLevel: params.riskLevel,
        page: String(p),
        pageSize: '24',
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog(searchParams, page);
  }, [searchParams, page, fetchCatalog]);

  const handleSearch = useCallback((params: { q: string; category: string; riskLevel: string }) => {
    setSearchParams(params);
    setPage(1);
  }, []);

  const handleToolClick = (tool: CatalogTool) => {
    setSelectedTool(tool);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-ctr px-8 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--dark)]">AI Tool Catalog</h1>
          <p className="mt-1 text-[var(--dark5)]">
            {result ? `${result.pagination.total} AI Tools` : 'Browse AI Tools'} — EU AI Act Risk Assessment
          </p>
        </div>
        <Link href={`/${locale}/tools/new`}>
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t('title')}
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <CatalogSearch onSearch={handleSearch} />
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-[var(--coral)] bg-[var(--coral-dim)] p-4">
          <p className="text-sm text-[var(--coral)]">{error}</p>
        </div>
      )}

      {loading && !result ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-[var(--b2)] bg-[var(--bg2)]" />
          ))}
        </div>
      ) : result && result.data.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((tool) => (
              <CatalogCard
                key={tool.id}
                tool={tool}
                onClick={() => handleToolClick(tool)}
              />
            ))}
          </div>

          {result.pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-[var(--dark4)]">
                Page {result.pagination.page} of {result.pagination.totalPages}
              </span>
              <Button variant="secondary" size="sm" disabled={page >= result.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-[var(--b2)] bg-[var(--card)] p-8 text-center">
          <p className="text-[var(--dark5)]">No AI Tools found. Try a different search.</p>
        </div>
      )}

      <CatalogDetailDialog
        tool={selectedTool}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
