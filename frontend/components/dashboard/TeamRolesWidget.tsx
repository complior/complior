'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { api, type TeamMember } from '@/lib/api';

const ROLE_COLORS: Record<string, string> = {
  owner: '#c0392b',
  admin: '#c0392b',
  member: '#2563eb',
  viewer: '#d97706',
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  owner: 'bg-[rgba(0,0,0,0.04)] text-[var(--dark4)] dark:bg-[rgba(255,255,255,0.06)] dark:text-[var(--dark3)]',
  admin: 'bg-[rgba(0,0,0,0.04)] text-[var(--dark4)] dark:bg-[rgba(255,255,255,0.06)] dark:text-[var(--dark3)]',
  member: 'bg-[rgba(0,0,0,0.04)] text-[var(--dark4)] dark:bg-[rgba(255,255,255,0.06)] dark:text-[var(--dark3)]',
  viewer: 'bg-[var(--bg3)] text-[var(--dark5)] dark:bg-[var(--bg4)]',
};

export function TeamRolesWidget() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    api.team.list()
      .then((res) => setMembers(res.members))
      .catch(() => {});
  }, []);

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="bg-[var(--card)] border border-[var(--b2)] rounded-xl p-5 transition-all dark:border-[var(--b3)]">
      {/* Header */}
      <div className="font-display text-[0.9375rem] font-bold text-[var(--dark)] mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 stroke-[var(--teal)]" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        {t('teamRoles')}
        <span className="font-mono text-[0.4375rem] bg-[var(--bg3)] text-[var(--dark4)] py-0.5 px-1.5 rounded ml-auto dark:bg-[var(--bg4)]">
          {members.length} members
        </span>
      </div>

      {members.length === 0 ? (
        <p className="text-[var(--dark5)] text-sm">No team members</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {members.slice(0, 6).map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2.5 py-2.5 px-3 border border-[var(--b)] rounded-lg transition-colors hover:border-[var(--b3)] dark:border-[var(--b3)] relative group"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-lg grid place-items-center text-[0.6875rem] font-bold text-white flex-shrink-0"
                style={{ background: ROLE_COLORS[member.role] || 'var(--dark4)' }}
              >
                {initials(member.fullName)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[0.8125rem] font-semibold text-[var(--dark)] truncate">{member.fullName}</div>
                <div className="text-[0.625rem] text-[var(--dark5)]">{member.role}</div>
              </div>

              {/* Role badge */}
              <span className={`font-mono text-[0.3125rem] font-bold uppercase tracking-[0.04em] py-0.5 px-1.5 rounded-sm flex-shrink-0 ${ROLE_BADGE_CLASS[member.role] || ROLE_BADGE_CLASS.viewer}`}>
                {member.role}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[var(--b)]">
        <Link href={`/${locale}/members`} className="font-mono text-[0.4375rem] font-bold text-[var(--teal)] no-underline hover:underline">
          View all members →
        </Link>
      </div>
    </div>
  );
}
