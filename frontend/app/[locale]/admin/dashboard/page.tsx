'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { api, AdminOverview, AdminAnalytics } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  active: '#059669',
  trialing: '#3b82f6',
  past_due: '#d97706',
  canceled: '#e74c3c',
  unpaid: '#6b7280',
};

const PLAN_COLORS = ['#6b7280', '#3b82f6', '#8b5cf6', '#059669', '#d97706'];

function formatEur(cents: number): string {
  return `\u20AC${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDay(day: string): string {
  const d = new Date(day);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.admin.overview(),
      api.admin.analytics(),
    ])
      .then(([ov, an]) => { setOverview(ov); setAnalytics(an); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-ctr px-8 py-8">
        <p className="text-[var(--coral)]">{error}</p>
      </div>
    );
  }

  if (!overview || !analytics) {
    return (
      <div className="mx-auto max-w-ctr px-8 py-8">
        <div className="text-[var(--dark4)] font-mono text-sm">Loading...</div>
      </div>
    );
  }

  const { kpis } = analytics;

  const kpiCards = [
    { label: t('totalUsers'), value: overview.totalUsers.toLocaleString() },
    { label: t('totalOrganizations'), value: overview.totalOrganizations.toLocaleString() },
    { label: t('activeSubscriptions'), value: overview.activeSubscriptions.toLocaleString() },
    { label: t('mrrLabel'), value: formatEur(kpis.totalMrrCents) },
    { label: t('trialConversion'), value: `${kpis.trialConversionRate}%` },
    { label: t('arpu'), value: formatEur(kpis.arpu) },
  ];

  const userChartData = analytics.usersByDay.map((d) => ({
    day: formatDay(d.day),
    count: d.count,
  }));

  const revenueChartData = analytics.revenueByPlan
    .filter((r) => r.mrrCents > 0)
    .map((r) => ({
      name: r.displayName,
      mrr: r.mrrCents / 100,
    }));

  const statusChartData = analytics.statusDistribution.map((s) => ({
    name: s.status,
    value: s.count,
  }));

  const planDistData = overview.planDistribution.map((p) => ({
    name: p.displayName,
    count: p.count,
  }));

  return (
    <div className="mx-auto max-w-ctr px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--dark)] mb-6 font-display">
        {t('dashboardTitle')}
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpiCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <div className="text-[0.75rem] font-semibold text-[var(--dark4)] uppercase tracking-wider mb-1">
                {s.label}
              </div>
              <div className="text-2xl font-bold text-[var(--dark)] font-display">
                {s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* User Registrations (30 days) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('userSignups')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--b2)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--dark4)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--dark4)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--b2)',
                      borderRadius: '8px',
                      color: 'var(--dark)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#0d9488"
                    fill="rgba(13,148,136,0.15)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* MRR by Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('revenueByPlan')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--b2)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--dark4)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--dark4)" />
                  <Tooltip
                    formatter={(value) => [`\u20AC${value}`, 'MRR']}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--b2)',
                      borderRadius: '8px',
                      color: 'var(--dark)',
                    }}
                  />
                  <Bar dataKey="mrr" radius={[4, 4, 0, 0]}>
                    {revenueChartData.map((_, i) => (
                      <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Subscription Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('subscriptionStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {statusChartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] || '#6b7280'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--b2)',
                      borderRadius: '8px',
                      color: 'var(--dark)',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('planDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planDistData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--b2)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--dark4)" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} stroke="var(--dark4)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--b2)',
                      borderRadius: '8px',
                      color: 'var(--dark)',
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {planDistData.map((_, i) => (
                      <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Signups Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('recentSignupsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--b)]">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--dark3)]">{t('email')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--dark3)]">{t('name')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--dark3)]">{t('organization')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--dark3)]">{t('planName')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--dark3)]">{t('signupDate')}</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentSignups.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--b)]">
                    <td className="py-3 px-4 text-[var(--dark)] font-mono text-xs">{u.email}</td>
                    <td className="py-3 px-4 text-[var(--dark)]">{u.fullName}</td>
                    <td className="py-3 px-4 text-[var(--dark)]">{u.organizationName}</td>
                    <td className="py-3 px-4 text-[var(--dark)]">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--b)] text-[var(--dark3)]">
                        {u.planName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--dark4)] font-mono text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {analytics.recentSignups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[var(--dark4)]">{t('noData')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
