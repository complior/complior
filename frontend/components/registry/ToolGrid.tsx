'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { RegistryTool, RegistrySearchResult, RegistryStats } from '@/lib/registry';
import { searchTools } from '@/lib/registry';
import { RegistrySearch } from './RegistrySearch';
import { RiskPillFilter } from './RiskPillFilter';
import { FeaturedRow } from './FeaturedRow';
import { ToolRow } from './ToolRow';
import { Pagination } from './Pagination';

interface ToolGridProps {
  initialData: RegistrySearchResult;
  featured: RegistryTool[];
  stats: RegistryStats | null;
}

export function ToolGrid({ initialData, featured, stats }: ToolGridProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [riskFilters, setRiskFilters] = useState<string[]>(
    searchParams.get('risk')?.split(',').filter(Boolean) || [],
  );
  const [sort, setSort] = useState(searchParams.get('sort') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [data, setData] = useState<RegistrySearchResult>(initialData);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isFirstRender = useRef(true);

  const hasFilters = query || riskFilters.length > 0 || sort;

  // Build risk counts from stats
  const riskCounts: Record<string, number> = {};
  if (stats?.byRiskLevel) {
    // Merge unacceptable into prohibited for display
    riskCounts.prohibited = (stats.byRiskLevel.unacceptable || 0);
    riskCounts.high = stats.byRiskLevel.high || 0;
    riskCounts.gpai = (stats.byRiskLevel.gpai || 0) + (stats.byRiskLevel.gpai_systemic || 0);
    riskCounts.limited = stats.byRiskLevel.limited || 0;
    riskCounts.minimal = stats.byRiskLevel.minimal || 0;
  }

  // Map UI pill keys to actual DB riskLevel values
  const mapRiskToDb = (risks: string[]): string | undefined => {
    if (risks.length === 0) return undefined;
    const dbValues: string[] = [];
    for (const r of risks) {
      if (r === 'prohibited') dbValues.push('unacceptable');
      else if (r === 'gpai') { dbValues.push('gpai'); dbValues.push('gpai_systemic'); }
      else dbValues.push(r);
    }
    return dbValues.join(',');
  };

  const fetchData = useCallback(async (q: string, risks: string[], s: string, p: number) => {
    setLoading(true);
    try {
      const result = await searchTools({
        q: q || undefined,
        risk: mapRiskToDb(risks),
        sort: s || undefined,
        page: p,
        limit: 20,
      });
      setData(result);
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync state to URL
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (riskFilters.length > 0) params.set('risk', riskFilters.join(','));
    if (sort) params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [query, riskFilters, sort, page, pathname, router]);

  // Debounced fetch
  useEffect(() => {
    if (isFirstRender.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(query, riskFilters, sort, page);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, riskFilters, sort, page, fetchData]);

  const handleRiskToggle = (risk: string) => {
    setRiskFilters((prev) =>
      prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk],
    );
    setPage(1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <RegistrySearch value={query} onChange={(v) => { setQuery(v); setPage(1); }} />
      <RiskPillFilter active={riskFilters} onToggle={handleRiskToggle} counts={riskCounts} />

      {!hasFilters && <FeaturedRow tools={featured} />}

      {/* Results count */}
      <div style={{
        fontFamily: 'var(--f-mono)',
        fontSize: '.6875rem',
        color: 'var(--dark5)',
        marginBottom: '1rem',
        opacity: loading ? 0.5 : 1,
        transition: '.2s',
      }}>
        Showing {data.pagination.total.toLocaleString()} tools
      </div>

      {/* Tools list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', opacity: loading ? 0.6 : 1, transition: '.2s' }}>
        {data.data.map((tool) => (
          <ToolRow key={tool.registryToolId} tool={tool} />
        ))}
      </div>

      {data.data.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: 'var(--dark4)',
          fontSize: '.875rem',
        }}>
          No tools found matching your criteria.
        </div>
      )}

      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.totalPages}
        onPageChange={handlePageChange}
      />

      {/* Responsive: hide score + articles columns on mobile */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .tool-score-col, .tool-articles-col { display: none !important; }
          a[style*="grid-template-columns: 2.5rem"] {
            grid-template-columns: 2.5rem 1fr auto !important;
          }
        }
      `}</style>
    </>
  );
}
