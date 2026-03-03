'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  api,
  UserProfile,
  DashboardSummary,
} from '@/lib/api';

const TABS = ['tabProfile', 'tabSSO', 'tabBilling'] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
  const t = useTranslations('settings');
  const [activeTab, setActiveTab] = useState<Tab>('tabProfile');

  return (
    <div className="mx-auto max-w-ctr px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--dark)] mb-6">
        {t('title')}
      </h1>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '2rem',
          borderBottom: '1px solid var(--b)',
          marginBottom: '1.5rem',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '.5rem 0',
              fontSize: '.875rem',
              fontWeight: 600,
              color: activeTab === tab ? 'var(--teal)' : 'var(--dark4)',
              borderBottom: activeTab === tab ? '2px solid var(--teal)' : '2px solid transparent',
              background: 'none',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === tab ? 'var(--teal)' : 'transparent',
              cursor: 'pointer',
              transition: '.25s',
              fontFamily: 'var(--f-body)',
            }}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'tabProfile' && <ProfileTab />}
      {activeTab === 'tabSSO' && <SSOTab />}
      {activeTab === 'tabBilling' && <BillingTab />}
    </div>
  );
}

/* ─── Profile Tab ─── */

function ProfileTab() {
  const t = useTranslations('settings');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.auth.me().then(setUser).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-[var(--coral)]">{error}</p>;
  if (!user) return <div className="text-[var(--dark4)] font-mono text-sm">Loading...</div>;

  const fields = [
    { label: t('profileName'), value: user.fullName },
    { label: t('profileEmail'), value: user.email },
    { label: t('profileRole'), value: user.roles.join(', ') },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('profileTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.label}>
                <div className="text-xs font-semibold text-[var(--dark4)] uppercase tracking-wider mb-1">
                  {f.label}
                </div>
                <div className="text-sm text-[var(--dark)]">{f.value}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--dark5)] mt-6">{t('profileOrgNote')}</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── SSO Tab ─── */

function SSOTab() {
  const t = useTranslations('settings');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Card>
        <CardHeader>
          <CardTitle>{t('ssoTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p style={{ color: 'var(--dark4)', marginBottom: '1rem', lineHeight: 1.6 }}>
            {t('ssoDescription')}
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '.5rem',
              padding: '.375rem .75rem',
              borderRadius: 6,
              fontSize: '.8125rem',
              fontWeight: 600,
              background: 'var(--bg2)',
              color: 'var(--dark4)',
              marginBottom: '1rem',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--dark5)',
              }}
            />
            {t('ssoNotConfigured')}
          </div>
          <p
            style={{
              fontSize: '.8125rem',
              color: 'var(--teal)',
              fontWeight: 600,
              marginTop: '.5rem',
            }}
          >
            {t('ssoAvailableOn')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('ssoSupportedProviders')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p style={{ color: 'var(--dark4)', lineHeight: 1.6 }}>
            {t('ssoProvidersList')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('ssoSetupLink')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p style={{ color: 'var(--dark4)', marginBottom: '1rem', lineHeight: 1.6 }}>
            {t('ssoContactSetup')}
          </p>
          <a
            href="https://workos.com/docs/sso"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '.375rem',
              fontSize: '.8125rem',
              fontWeight: 600,
              color: 'var(--teal)',
              textDecoration: 'none',
            }}
          >
            {t('ssoLearnMore')} &rarr;
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Billing Tab ─── */

function BillingTab() {
  const t = useTranslations('settings');
  const locale = useLocale();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard.summary().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-[var(--coral)]">{error}</p>;
  if (!data) return <div className="text-[var(--dark4)] font-mono text-sm">Loading...</div>;

  const { tools, users } = data.planLimits;

  const renderBar = (current: number, limit: number) => {
    if (limit === -1) return <span className="text-xs text-[var(--dark4)]">{t('billingUnlimited')}</span>;
    const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
    const color = pct >= 90 ? '#e74c3c' : pct >= 70 ? '#d97706' : 'var(--teal)';
    return (
      <div>
        <div className="flex justify-between text-xs text-[var(--dark4)] mb-1">
          <span>{t('billingUsed', { current: String(current), limit: String(limit) })}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="w-full h-2 bg-[var(--bg2)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('billingTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-semibold text-[var(--dark4)] uppercase tracking-wider mb-2">
                {t('billingTools')}
              </div>
              {renderBar(tools.current, tools.limit)}
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--dark4)] uppercase tracking-wider mb-2">
                {t('billingUsers')}
              </div>
              {renderBar(users.current, users.limit)}
            </div>
          </div>
          <div className="mt-6">
            <Link href={`/${locale}/pricing`}>
              <Button variant="outline">{t('billingUpgrade')}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
