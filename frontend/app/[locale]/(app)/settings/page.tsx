'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const TABS = ['tabProfile', 'tabSSO', 'tabTeam', 'tabBilling'] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
  const t = useTranslations('settings');
  const [activeTab, setActiveTab] = useState<Tab>('tabSSO');

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
      {activeTab === 'tabSSO' && <SSOTab t={t} />}
      {activeTab === 'tabProfile' && <PlaceholderTab t={t} titleKey="profileTitle" />}
      {activeTab === 'tabTeam' && <PlaceholderTab t={t} titleKey="teamTitle" />}
      {activeTab === 'tabBilling' && <PlaceholderTab t={t} titleKey="billingTitle" />}
    </div>
  );
}

function SSOTab({ t }: { t: ReturnType<typeof useTranslations<'settings'>> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* SSO Overview */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ssoTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p style={{ color: 'var(--dark4)', marginBottom: '1rem', lineHeight: 1.6 }}>
            {t('ssoDescription')}
          </p>

          {/* Status */}
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

      {/* Supported Providers */}
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

      {/* Setup Instructions */}
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

function PlaceholderTab({
  t,
  titleKey,
}: {
  t: ReturnType<typeof useTranslations<'settings'>>;
  titleKey: 'profileTitle' | 'teamTitle' | 'billingTitle';
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(titleKey)}</CardTitle>
      </CardHeader>
      <CardContent>
        <p style={{ color: 'var(--dark4)' }}>
          <strong>{t('comingSoon')}</strong> &mdash; {t('comingSoonDesc')}
        </p>
      </CardContent>
    </Card>
  );
}
