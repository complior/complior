'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { api, type TeamListResponse } from '@/lib/api';
import { MemberStats } from '@/components/members/MemberStats';
import { MembersTable } from '@/components/members/MembersTable';
import { InviteDialog } from '@/components/members/InviteDialog';
import { TrainingUsers } from '@/components/members/TrainingUsers';

export default function MembersPage() {
  const t = useTranslations('members');
  const [team, setTeam] = useState<TeamListResponse | null>(null);
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadTeam = useCallback(() => {
    api.team.list().then(setTeam).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handleInvite = async (email: string, role: string) => {
    await api.team.invite({ email, role });
    loadTeam();
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

  if (error && !team) {
    return (
      <div className="mx-auto max-w-ctr px-8 py-8">
        <p className="text-[var(--coral)]">{error}</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-ctr px-8 py-8">
        <div className="text-[var(--dark4)] font-mono text-sm">Loading...</div>
      </div>
    );
  }

  const limitReached = team.limits.max !== -1 &&
    (team.limits.current + team.limits.pending) >= team.limits.max;

  const ROLE_LABELS: Record<string, string> = {
    owner: t('owner'),
    admin: t('admin'),
    member: t('member'),
    viewer: t('viewer'),
  };

  return (
    <div className="mx-auto max-w-ctr px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--dark)] font-display">
            {t('title')}
          </h1>
          <p className="text-sm text-[var(--dark5)] mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="mt-3 sm:mt-0">
          <UserPlus className="mr-1.5 h-4 w-4" />
          {t('inviteMember')}
        </Button>
      </div>

      {error && <p className="text-[var(--coral)] text-sm mb-4">{error}</p>}

      {/* Stats */}
      <MemberStats team={team} />

      {/* Members Table */}
      <div className="mb-6">
        <MembersTable members={team.members} onRemove={handleRemove} />
      </div>

      {/* Pending Invitations */}
      {team.invitations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('pendingInvitations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--b)]">
                    <th className="text-left py-3 px-3 text-[0.6875rem] font-semibold text-[var(--dark4)] uppercase tracking-wider">{t('email')}</th>
                    <th className="text-left py-3 px-3 text-[0.6875rem] font-semibold text-[var(--dark4)] uppercase tracking-wider">{t('role')}</th>
                    <th className="text-left py-3 px-3 text-[0.6875rem] font-semibold text-[var(--dark4)] uppercase tracking-wider">{t('invitedBy')}</th>
                    <th className="text-right py-3 px-3 text-[0.6875rem] font-semibold text-[var(--dark4)] uppercase tracking-wider">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {team.invitations.map((inv) => (
                    <tr key={inv.invitationId} className="border-b border-[var(--b)]">
                      <td className="py-3 px-3 text-[var(--dark)] font-mono text-xs">{inv.email}</td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg2)] text-[var(--dark3)]">
                          {ROLE_LABELS[inv.role] || inv.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[var(--dark4)] text-xs">{inv.invitedBy}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleResend(inv.invitationId)}>
                            {t('resend')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRevoke(inv.invitationId)}>
                            {t('revoke')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Users (Locked) */}
      <TrainingUsers />

      {/* Invite Dialog */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={handleInvite}
        limitReached={limitReached}
        limitInfo={{ current: team.limits.current + team.limits.pending, max: team.limits.max }}
      />
    </div>
  );
}
