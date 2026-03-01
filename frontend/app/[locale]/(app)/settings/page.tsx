'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  api,
  UserProfile,
  TeamListResponse,
  DashboardSummary,
} from '@/lib/api';

const TABS = ['tabProfile', 'tabSSO', 'tabTeam', 'tabBilling'] as const;
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
      {activeTab === 'tabTeam' && <TeamTab />}
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

/* ─── Team Tab ─── */

function TeamTab() {
  const t = useTranslations('settings');
  const [team, setTeam] = useState<TeamListResponse | null>(null);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  const loadTeam = useCallback(() => {
    api.team.list().then(setTeam).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  if (error) return <p className="text-[var(--coral)]">{error}</p>;
  if (!team) return <div className="text-[var(--dark4)] font-mono text-sm">Loading...</div>;

  const limitReached = team.limits.max !== -1 &&
    (team.limits.current + team.limits.pending) >= team.limits.max;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.team.invite({ email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      loadTeam();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: number) => {
    try {
      await api.team.remove(userId);
      loadTeam();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleRevoke = async (invitationId: number) => {
    try {
      await api.team.revokeInvitation(invitationId);
      loadTeam();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleResend = async (invitationId: number) => {
    try {
      await api.team.resendInvitation(invitationId);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const ROLE_LABELS: Record<string, string> = {
    owner: t('teamOwner'),
    admin: t('teamAdmin'),
    member: t('teamMember'),
    viewer: t('teamViewer'),
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('teamInvite')}</CardTitle>
        </CardHeader>
        <CardContent>
          {limitReached ? (
            <p className="text-sm text-[var(--coral)]">
              {t('teamLimitReached', {
                current: String(team.limits.current + team.limits.pending),
                max: String(team.limits.max),
              })}
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t('teamInviteEmail')}
                className="flex-1 rounded-md border border-[var(--b2)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--dark)] placeholder:text-[var(--dark5)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-md border border-[var(--b2)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
              >
                <option value="admin">{t('teamAdmin')}</option>
                <option value="member">{t('teamMember')}</option>
                <option value="viewer">{t('teamViewer')}</option>
              </select>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                {t('teamInviteSend')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('teamMembers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--b)]">
                  <th className="text-left py-3 px-3 font-semibold text-[var(--dark3)]">{t('teamName')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-[var(--dark3)]">{t('teamEmail')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-[var(--dark3)]">{t('teamRole')}</th>
                  <th className="text-left py-3 px-3 font-semibold text-[var(--dark3)]">{t('teamLastLogin')}</th>
                  <th className="text-right py-3 px-3 font-semibold text-[var(--dark3)]">{t('teamActions')}</th>
                </tr>
              </thead>
              <tbody>
                {team.members.map((member) => (
                  <tr key={member.id} className="border-b border-[var(--b)]">
                    <td className="py-3 px-3 text-[var(--dark)]">{member.fullName}</td>
                    <td className="py-3 px-3 text-[var(--dark)] font-mono text-xs">{member.email}</td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--b)] text-[var(--dark3)]">
                        {ROLE_LABELS[member.role] || member.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[var(--dark4)] font-mono text-xs">
                      {member.lastLoginAt
                        ? new Date(member.lastLoginAt).toLocaleDateString()
                        : t('teamNever')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(member.id)}
                        >
                          {t('teamRemove')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>{t('teamInvitations')}</CardTitle>
        </CardHeader>
        <CardContent>
          {team.invitations.length === 0 ? (
            <p className="text-[var(--dark4)] text-sm">{t('teamNoInvitations')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--b)]">
                    <th className="text-left py-3 px-3 font-semibold text-[var(--dark3)]">{t('teamEmail')}</th>
                    <th className="text-left py-3 px-3 font-semibold text-[var(--dark3)]">{t('teamRole')}</th>
                    <th className="text-left py-3 px-3 font-semibold text-[var(--dark3)]">{t('teamInvitedBy')}</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--dark3)]">{t('teamActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {team.invitations.map((inv) => (
                    <tr key={inv.invitationId} className="border-b border-[var(--b)]">
                      <td className="py-3 px-3 text-[var(--dark)] font-mono text-xs">{inv.email}</td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--b)] text-[var(--dark3)]">
                          {ROLE_LABELS[inv.role] || inv.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[var(--dark4)] text-xs">{inv.invitedBy}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleResend(inv.invitationId)}>
                            {t('teamResend')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRevoke(inv.invitationId)}>
                            {t('teamRevoke')}
                          </Button>
                        </div>
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
