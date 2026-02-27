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

const ROLE_OPTIONS = ['provider', 'deployer_product', 'hybrid', 'infrastructure', 'ai_feature'] as const;
const ROLE_LABELS: Record<string, string> = {
  provider: 'Provider',
  deployer_product: 'AI Product',
  hybrid: 'Hybrid',
  infrastructure: 'Infrastructure',
  ai_feature: 'AI Feature',
};

const SORT_OPTIONS = [
  { value: '', label: 'Sort: Popular' },
  { value: 'name', label: 'Sort: Name A-Z' },
  { value: 'doc-grade-desc', label: 'Sort: Doc Grade ↓' },
  { value: 'doc-grade-asc', label: 'Sort: Doc Grade ↑' },
  { value: 'risk-desc', label: 'Sort: Risk ↓' },
  { value: 'obligations-desc', label: 'Sort: Obligations ↓' },
];

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
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [data, setData] = useState<RegistrySearchResult>(initialData);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isFirstRender = useRef(true);

  const hasFilters = query || riskFilters.length > 0 || roleFilter || categoryFilter || sort;

  // Build risk counts from stats
  const riskCounts: Record<string, number> = {};
  if (stats?.byRiskLevel) {
    riskCounts.prohibited = (stats.byRiskLevel.unacceptable || 0);
    riskCounts.high = stats.byRiskLevel.high || 0;
    riskCounts.gpai = (stats.byRiskLevel.gpai || 0) + (stats.byRiskLevel.gpai_systemic || 0);
    riskCounts.limited = stats.byRiskLevel.limited || 0;
    riskCounts.minimal = stats.byRiskLevel.minimal || 0;
  }

  // Build category list from stats
  const categories = stats?.topCategories?.map((c) => c.category).filter(Boolean) || [];

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

  const fetchData = useCallback(async (q: string, risks: string[], role: string, category: string, s: string, p: number) => {
    setLoading(true);
    try {
      const result = await searchTools({
        q: q || undefined,
        risk: mapRiskToDb(risks),
        aiActRole: role || undefined,
        category: category || undefined,
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
    if (roleFilter) params.set('role', roleFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (sort) params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [query, riskFilters, roleFilter, categoryFilter, sort, page, pathname, router]);

  // Debounced fetch
  useEffect(() => {
    if (isFirstRender.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(query, riskFilters, roleFilter, categoryFilter, sort, page);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, riskFilters, roleFilter, categoryFilter, sort, page, fetchData]);

  const handleRiskToggle = (risk: string) => {
    setRiskFilters((prev) =>
      prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk],
    );
    setPage(1);
  };

  const handleRoleToggle = (role: string) => {
    setRoleFilter((prev) => prev === role ? '' : role);
    setPage(1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filterSelectStyle: React.CSSProperties = {
    fontFamily: 'var(--f-mono)',
    fontSize: '.625rem',
    padding: '.3125rem .5rem',
    borderRadius: 6,
    border: '1px solid var(--b2)',
    background: 'var(--card)',
    color: 'var(--dark4)',
    cursor: 'pointer',
    outline: 'none',
    paddingRight: '1.25rem',
  };

  const rolePillStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: 'var(--f-mono)',
    fontSize: '.625rem',
    fontWeight: 500,
    padding: '.25rem .5rem',
    borderRadius: 100,
    border: `1px solid ${active ? 'var(--dark4)' : 'var(--b2)'}`,
    background: active ? 'var(--card2)' : 'transparent',
    color: active ? 'var(--dark2)' : 'var(--dark5)',
    cursor: 'pointer',
    transition: '.2s',
    userSelect: 'none',
  });

  return (
    <>
      <RegistrySearch value={query} onChange={(v) => { setQuery(v); setPage(1); }} />

      {/* Filters container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.75rem' }}>
        {/* Row 1: Risk pills */}
        <RiskPillFilter active={riskFilters} onToggle={handleRiskToggle} counts={riskCounts} />

        {/* Row 2: Role pills + category + sort */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', alignItems: 'center' }}>
          {ROLE_OPTIONS.map((role) => (
            <button
              key={role}
              onClick={() => handleRoleToggle(role)}
              style={rolePillStyle(roleFilter === role)}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}

          {/* Separator */}
          <div style={{ width: 1, height: 20, background: 'var(--b2)', margin: '0 .125rem' }} />

          {/* Category select */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            style={filterSelectStyle}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Sort select */}
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            style={filterSelectStyle}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

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

      {/* Responsive: hide obligation + community columns on mobile */}
      <style jsx global>{`
        @media (max-width: 1024px) {
          .tool-obl-col { display: none !important; }
          a[style*="grid-template-columns: 2.5rem"] {
            grid-template-columns: 2.5rem 1fr auto auto !important;
            gap: .75rem !important;
          }
        }
        @media (max-width: 768px) {
          .tool-obl-col, .tool-articles-col { display: none !important; }
          a[style*="grid-template-columns: 2.5rem"] {
            grid-template-columns: 2.5rem 1fr auto !important;
          }
        }
        @media (max-width: 640px) {
          a[style*="grid-template-columns: 2.5rem"] {
            grid-template-columns: 2rem 1fr auto !important;
            gap: .5rem !important;
          }
        }
      `}</style>
    </>
  );
}
