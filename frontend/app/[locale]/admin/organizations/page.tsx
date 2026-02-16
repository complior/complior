'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { api, AdminOrganization, PaginatedResponse } from '@/lib/api';

const PLANS = ['free', 'starter', 'growth', 'scale', 'enterprise'];

export default function AdminOrganizationsPage() {
  const t = useTranslations('admin');
  const [data, setData] = useState<PaginatedResponse<AdminOrganization> | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchData = useCallback(() => {
    const params: Record<string, string> = { page: String(page), pageSize: '20' };
    if (debouncedQuery) params.q = debouncedQuery;
    if (planFilter) params.planName = planFilter;
    api.admin.organizations(params).then(setData).catch((e) => setError(e.message));
  }, [page, debouncedQuery, planFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, planFilter]);

  if (error) {
    return (
      <div className="mx-auto max-w-ctr px-8 py-8">
        <p className="text-[var(--coral)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-ctr px-8 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('organizationsTitle')}</CardTitle>
          <CardDescription>{t('organizationsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full max-w-sm rounded-md border border-[var(--b2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--dark)] placeholder:text-[var(--dark5)] focus:border-[var(--teal)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
            />
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded-md border border-[var(--b2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--dark)] focus:border-[var(--teal)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
            >
              <option value="">{t('allPlans')}</option>
              {PLANS.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--b)]">
                  <th className="text-left py-3 px-3 font-semibold text-[var(--dark3)]">{t('name')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-[var(--dark3)]">{t('industry')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-[var(--dark3)]">{t('size')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-[var(--dark3)]">{t('country')}</th>
                  <th className="text-right py-3 px-3 font-semibold text-[var(--dark3)]">{t('userCount')}</th>
                  <th className="text-right py-3 px-3 font-semibold text-[var(--dark3)]">{t('toolCount')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-[var(--dark3)]">{t('planName')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-[var(--dark3)]">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((org) => (
                  <tr key={org.id} className="border-b border-[var(--b)] hover:bg-[var(--bg2)] transition-colors">
                    <td className="py-3 px-3 text-[var(--dark)] font-medium">{org.name}</td>
                    <td className="py-3 px-3 text-[var(--dark)]">{org.industry || '—'}</td>
                    <td className="py-3 px-3 text-[var(--dark)]">{org.size || '—'}</td>
                    <td className="py-3 px-3 text-[var(--dark)]">{org.country || '—'}</td>
                    <td className="py-3 px-3 text-right text-[var(--dark)] font-mono">{org.userCount}</td>
                    <td className="py-3 px-3 text-right text-[var(--dark)] font-mono">{org.toolCount}</td>
                    <td className="py-3 px-3">
                      <span className="inline-block rounded-full bg-[var(--teal-dim)] px-2 py-0.5 text-xs font-medium text-[var(--teal)]">
                        {org.planName || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={org.subscriptionStatus} />
                    </td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[var(--dark4)]">{t('noData')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-[var(--b2)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--dark)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg2)] transition-colors"
              >
                {t('previous')}
              </button>
              <span className="text-sm text-[var(--dark4)]">
                {t('page')} {page} {t('of')} {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page >= data.pagination.totalPages}
                className="rounded-md border border-[var(--b2)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--dark)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg2)] transition-colors"
              >
                {t('nextPage')}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[rgba(5,150,105,0.1)] text-[var(--green)]',
    trialing: 'bg-[rgba(59,130,246,0.1)] text-[#3b82f6]',
    past_due: 'bg-[rgba(217,119,6,0.1)] text-[var(--amber)]',
    canceled: 'bg-[var(--coral-dim)] text-[var(--coral)]',
  };
  const cls = colors[status] || 'bg-[var(--bg2)] text-[var(--dark4)]';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status || '—'}
    </span>
  );
}
