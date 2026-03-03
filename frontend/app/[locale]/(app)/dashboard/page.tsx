'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { api, DashboardSummary, UserProfile } from '@/lib/api';
import { WelcomeBar } from '@/components/dashboard/WelcomeBar';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { RiskDonutChart } from '@/components/dashboard/RiskDonutChart';
import { AttentionAlerts } from '@/components/dashboard/AttentionAlerts';
import { ComplianceBreakdown } from '@/components/dashboard/ComplianceBreakdown';
import { PenaltyExposure } from '@/components/dashboard/PenaltyExposure';
import { DocumentStatus } from '@/components/dashboard/DocumentStatus';
import { TimelineWidget } from '@/components/dashboard/TimelineWidget';
import { ToolsTable } from '@/components/dashboard/ToolsTable';
import { TeamRolesWidget } from '@/components/dashboard/TeamRolesWidget';
import { LiteracyWidget } from '@/components/dashboard/LiteracyWidget';
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard.summary()
      .then(setData)
      .catch((e) => setError(e.message));
    api.auth.me()
      .then(setUser)
      .catch(() => {});
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-ctr px-6 py-8">
        <p className="text-[var(--coral)]">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-ctr px-6 py-8">
        <div className="text-[var(--dark4)] font-mono text-sm">Loading...</div>
      </div>
    );
  }

  // Empty state — no tools yet
  if (data.tools.total === 0) {
    return (
      <div className="mx-auto max-w-ctr px-6 py-8">
        {user && <WelcomeBar userName={user.fullName} />}
        <div className="bg-[var(--card)] border border-[var(--b2)] rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">{'\uD83D\uDEE1\uFE0F'}</div>
          <h2 className="text-xl font-bold text-[var(--dark)] font-display mb-2">
            {t('emptyTitle')}
          </h2>
          <p className="text-[var(--dark4)] mb-6">{t('emptyDesc')}</p>
          <Link
            href={`/${locale}/tools/catalog`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--teal)] text-white font-bold text-sm shadow-[0_2px_8px_var(--teal-glow)] hover:bg-[var(--teal2)] transition-all no-underline dark:text-[var(--bg)]"
          >
            {t('addFirstTool')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-ctr px-6 py-8">
      {/* Welcome Bar */}
      <WelcomeBar userName={user?.fullName || ''} />

      {/* Quick Actions */}
      <QuickActions />

      {/* 5 Summary Cards */}
      <SummaryCards data={data} />

      {/* Row 1: Risk Distribution + Requires Attention (2-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <RiskDonutChart riskDistribution={data.riskDistribution} />
        <AttentionAlerts alerts={data.requiresAttention} />
      </div>

      {/* Row 2: Compliance Breakdown + Penalty Exposure (2-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ComplianceBreakdown />
        <PenaltyExposure riskDistribution={data.riskDistribution} />
      </div>

      {/* Row 3: Document Status + Timeline (2-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <DocumentStatus highRiskTools={data.requiresAttention.filter(a => a.severity !== 'medium').map(a => ({ toolId: a.toolId, toolName: a.toolName }))} />
        <TimelineWidget timeline={data.timeline} />
      </div>

      {/* AI Tools Table (full width) */}
      <div className="mb-4">
        <ToolsTable />
      </div>

      {/* Team (full width) */}
      <div className="mb-4">
        <TeamRolesWidget />
      </div>

      {/* Recent Activity (full width) */}
      <div className="mb-4">
        <RecentActivityWidget activity={data.recentActivity} />
      </div>
    </div>
  );
}
