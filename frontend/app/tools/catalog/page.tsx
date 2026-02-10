'use client';

import { useCallback, useEffect, useState } from 'react';
import { CatalogSearch } from '@/components/tools/CatalogSearch';
import { CatalogCard } from '@/components/tools/CatalogCard';
import { CatalogDetailDialog } from '@/components/tools/CatalogDetailDialog';
import { Button } from '@/components/ui/Button';
import { api, type CatalogTool, type PaginatedResponse } from '@/lib/api';

export default function CatalogPage() {
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
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">AI Tool Katalog</h1>
        <p className="mt-1 text-slate-500">
          {result ? `${result.pagination.total} AI Tools` : 'AI Tools durchsuchen'} — EU AI Act Risikobewertung
        </p>
      </div>

      <div className="mb-6">
        <CatalogSearch onSearch={handleSearch} />
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading && !result ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
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

          {/* Pagination */}
          {result.pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Zurück
              </Button>
              <span className="text-sm text-slate-600">
                Seite {result.pagination.page} von {result.pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= result.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Weiter
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-500">
            Keine AI Tools gefunden. Versuchen Sie eine andere Suche.
          </p>
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
