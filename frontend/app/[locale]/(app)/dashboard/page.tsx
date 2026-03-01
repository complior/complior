'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, DashboardSummary } from '@/lib/api';

const RISK_COLORS: Record<string, string> = {
  prohibited: '#e74c3c',
  high: '#d97706',
  gpai: '#3b82f6',
  limited: '#8b5cf6',
  minimal: '#059669',
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'rgba(231,76,60,0.1)', text: '#e74c3c' },
  high: { bg: 'rgba(217,119,6,0.1)', text: '#d97706' },
  medium: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' },
};

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard.summary()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-ctr px-8 py-8">
        <p className="text-[var(--coral)]">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-ctr px-8 py-8">
        <div className="text-[var(--dark4)] font-mono text-sm">Loading...</div>
      </div>
    );
  }

  // Empty state — no tools yet
  if (data.tools.total === 0) {
    return (
      <div className="mx-auto max-w-ctr px-8 py-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--dark)] mb-6 font-display">
          {t('title')}
        </h1>
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-5xl mb-4">🛡️</div>
            <h2 className="text-xl font-bold text-[var(--dark)] font-display mb-2">
              {t('emptyTitle')}
            </h2>
            <p className="text-[var(--dark4)] mb-6">{t('emptyDesc')}</p>
            <Link href={`/${locale}/tools/catalog`}>
              <Button>{t('addFirstTool')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const highRiskCount = data.riskDistribution.high + data.riskDistribution.prohibited;
  const scorePercent = data.complianceScore.overall ?? 0;
  const toolLimit = data.planLimits.tools.limit === -1
    ? t('unlimited')
    : `${data.planLimits.tools.current} / ${data.planLimits.tools.limit}`;

  const kpiCards = [
    {
      label: t('totalTools'),
      value: String(data.tools.total),
      sub: `${data.tools.classified} ${t('classified')}, ${data.tools.unclassified} ${t('unclassified')}`,
    },
    {
      label: t('complianceScore'),
      value: `${scorePercent}%`,
      sub: data.complianceScore.toolCount > 0
        ? `${data.complianceScore.toolCount} tools scored`
        : '',
    },
    {
      label: t('highRiskCount'),
      value: String(highRiskCount),
      sub: highRiskCount > 0 ? `${data.riskDistribution.prohibited} prohibited` : '',
    },
    {
      label: t('planUsage'),
      value: toolLimit,
      sub: `tools`,
    },
  ];

  // Risk distribution chart data
  const riskChartData = Object.entries(data.riskDistribution)
    .filter(([, count]) => count > 0)
    .map(([risk, count]) => ({
      name: t(risk as 'prohibited' | 'high' | 'gpai' | 'limited' | 'minimal'),
      value: count,
      risk,
    }));

  return (
    <div className="mx-auto max-w-ctr px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--dark)] mb-6 font-display">
        {t('title')}
      </h1>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-6">
              <div className="text-[0.75rem] font-semibold text-[var(--dark4)] uppercase tracking-wider mb-1">
                {kpi.label}
              </div>
              <div className="text-2xl font-bold text-[var(--dark)] font-display">
                {kpi.value}
              </div>
              {kpi.sub && (
                <div className="text-xs text-[var(--dark5)] mt-1">{kpi.sub}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Requires Attention + AI Act Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Requires Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('requiresAttention')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.requiresAttention.length === 0 ? (
              <p className="text-[var(--dark4)] text-sm">{t('noAlerts')}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.requiresAttention.map((alert, i) => {
                  const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium;
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-lg p-3" style={{ background: style.bg }}>
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[0.6875rem] font-bold uppercase shrink-0 mt-0.5"
                        style={{ color: style.text, background: 'rgba(255,255,255,0.6)' }}
                      >
                        {t(alert.severity as 'critical' | 'high' | 'medium')}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--dark)]">{alert.toolName}</div>
                        <div className="text-xs text-[var(--dark4)]">{alert.reason}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Act Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('timeline')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {data.timeline.map((milestone, i) => {
                const isPast = milestone.daysUntil <= 0;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 mt-1"
                        style={{ background: isPast ? '#059669' : '#d97706' }}
                      />
                      {i < data.timeline.length - 1 && (
                        <div className="w-px flex-1 bg-[var(--b2)] mt-1" />
                      )}
                    </div>
                    <div className="pb-2">
                      <div className="text-sm font-semibold text-[var(--dark)]">{milestone.title}</div>
                      <div className="text-xs text-[var(--dark4)] mt-0.5">{milestone.description}</div>
                      <div className="text-xs font-mono mt-1" style={{ color: isPast ? '#059669' : '#d97706' }}>
                        {milestone.date} — {isPast
                          ? t('daysPast', { days: String(Math.abs(milestone.daysUntil)) })
                          : t('daysUntil', { days: String(milestone.daysUntil) })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Risk Distribution Pie + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk PieChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('riskDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {riskChartData.length === 0 ? (
              <p className="text-[var(--dark4)] text-sm">No classified tools yet</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={false}
                    >
                      {riskChartData.map((entry) => (
                        <Cell key={entry.risk} fill={RISK_COLORS[entry.risk] || '#6b7280'} />
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
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="text-[var(--dark4)] text-sm">{t('noActivity')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {data.recentActivity.map((entry) => (
                      <tr key={entry.auditLogId} className="border-b border-[var(--b)]">
                        <td className="py-3 pr-3">
                          <div className="text-[var(--dark)] font-medium text-sm">
                            {entry.fullName || entry.email}
                          </div>
                          <div className="text-xs text-[var(--dark4)]">
                            {entry.action} {entry.entity}
                          </div>
                        </td>
                        <td className="py-3 text-right text-[var(--dark5)] font-mono text-xs whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
