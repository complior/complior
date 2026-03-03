'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { TeamMember } from '@/lib/api';

const ROLE_STYLES: Record<string, string> = {
  owner: 'bg-[rgba(231,76,60,0.1)] text-[#e74c3c]',
  admin: 'bg-[rgba(217,119,6,0.1)] text-[#d97706]',
  member: 'bg-[rgba(13,148,136,0.1)] text-[var(--teal)]',
  viewer: 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]',
};

interface MembersTableProps {
  members: TeamMember[];
  onRemove: (userId: number) => void;
}

export function MembersTable({ members, onRemove }: MembersTableProps) {
  const t = useTranslations('members');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const ROLE_LABELS: Record<string, string> = {
    owner: t('owner'),
    admin: t('admin'),
    member: t('member'),
    viewer: t('viewer'),
  };

  const filtered = members.filter((m) => {
    const matchesSearch = !search || m.fullName.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg">{t('totalMembers')} ({members.length})</CardTitle>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="rounded-md border border-[var(--b2)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--dark)] placeholder:text-[var(--dark5)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-md border border-[var(--b2)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
            >
              <option value="">{t('allRoles')}</option>
              <option value="owner">{t('owner')}</option>
              <option value="admin">{t('admin')}</option>
              <option value="member">{t('member')}</option>
              <option value="viewer">{t('viewer')}</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--b)]">
                <th className="text-left py-3 px-3 text-[0.6875rem] font-semibold text-[var(--dark4)] uppercase tracking-wider">{t('name')}</th>
                <th className="text-left py-3 px-3 text-[0.6875rem] font-semibold text-[var(--dark4)] uppercase tracking-wider">{t('email')}</th>
                <th className="text-left py-3 px-3 text-[0.6875rem] font-semibold text-[var(--dark4)] uppercase tracking-wider">{t('role')}</th>
                <th className="text-left py-3 px-3 text-[0.6875rem] font-semibold text-[var(--dark4)] uppercase tracking-wider">{t('status')}</th>
                <th className="text-left py-3 px-3 text-[0.6875rem] font-semibold text-[var(--dark4)] uppercase tracking-wider">{t('lastLogin')}</th>
                <th className="text-right py-3 px-3 text-[0.6875rem] font-semibold text-[var(--dark4)] uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id} className="border-b border-[var(--b)]">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-[var(--bg2)] flex items-center justify-center text-xs font-bold text-[var(--dark4)]">
                        {member.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[var(--dark)] font-medium">{member.fullName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-[var(--dark4)] font-mono text-xs">{member.email}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_STYLES[member.role] || 'bg-[var(--bg2)] text-[var(--dark4)]'}`}>
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1 text-xs ${member.active ? 'text-[#059669]' : 'text-[var(--dark5)]'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${member.active ? 'bg-[#059669]' : 'bg-[var(--dark5)]'}`} />
                      {member.active ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[var(--dark5)] font-mono text-xs">
                    {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : t('never')}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {member.role !== 'owner' && (
                      <Button variant="ghost" size="sm" onClick={() => onRemove(member.id)}>
                        {t('remove')}
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
  );
}
