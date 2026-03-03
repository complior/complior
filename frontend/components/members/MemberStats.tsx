'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/Card';
import type { TeamListResponse } from '@/lib/api';

interface MemberStatsProps {
  team: TeamListResponse;
}

export function MemberStats({ team }: MemberStatsProps) {
  const t = useTranslations('members');

  const admins = team.members.filter((m) => m.role === 'admin' || m.role === 'owner').length;
  const active = team.members.filter((m) => m.active).length;

  const stats = [
    { label: t('totalMembers'), value: String(team.members.length), color: 'var(--teal)' },
    { label: t('admins'), value: String(admins), color: '#d97706' },
    { label: t('activeNow'), value: String(active), color: '#059669' },
    { label: t('pendingInvites'), value: String(team.invitations.length), color: '#8b5cf6' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-5">
            <div className="text-[0.6875rem] font-semibold text-[var(--dark4)] uppercase tracking-wider mb-1">
              {stat.label}
            </div>
            <div className="text-2xl font-bold font-display" style={{ color: stat.color }}>
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
