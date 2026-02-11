'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InventoryFilters } from '@/components/tools/InventoryFilters';
import { InventoryTable } from '@/components/tools/InventoryTable';
import { api, type AITool, type PaginatedResponse } from '@/lib/api';

export default function InventoryPage() {
  const [result, setResult] = useState<PaginatedResponse<AITool> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ q: '', riskLevel: '', domain: '', status: '' });
  const [page, setPage] = useState(1);

  const fetchTools = useCallback(async (f: typeof filters, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.tools.list({
        q: f.q,
        riskLevel: f.riskLevel,
        domain: f.domain,
        status: f.status,
        page: String(p),
        pageSize: '20',
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTools(filters, page);
  }, [filters, page, fetchTools]);

  const handleFilter = useCallback((params: typeof filters) => {
    setFilters(params);
    setPage(1);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Tool Inventar</h1>
          <p className="mt-1 text-sm text-slate-500">
            {result ? `${result.pagination.total} registrierte Tools` : 'AI Tools verwalten'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tools/catalog">
            <Button variant="secondary" size="sm">
              <SearchIcon className="mr-1.5 h-4 w-4" />
              Katalog durchsuchen
            </Button>
          </Link>
          <Link href="/tools/new">
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              AI-Tool hinzufügen
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <InventoryFilters onFilter={handleFilter} />
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading && !result ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-md border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : result ? (
        <>
          <InventoryTable tools={result.data} />

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
      ) : null}
    </div>
  );
}
