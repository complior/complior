'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (email: string, role: string) => Promise<void>;
  limitReached: boolean;
  limitInfo?: { current: number; max: number };
}

export function InviteDialog({ open, onOpenChange, onInvite, limitReached, limitInfo }: InviteDialogProps) {
  const t = useTranslations('members');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setSending(true);
    setError('');
    try {
      await onInvite(email.trim(), role);
      setEmail('');
      setRole('member');
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--card)] border-[var(--b2)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--dark)]">{t('inviteTitle')}</DialogTitle>
          <DialogDescription className="text-[var(--dark5)]">{t('inviteDesc')}</DialogDescription>
        </DialogHeader>

        {limitReached && limitInfo ? (
          <p className="text-sm text-[var(--coral)] py-4">
            {t('limitReached', { current: String(limitInfo.current), max: String(limitInfo.max) })}
          </p>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--dark4)] uppercase tracking-wider mb-1">
                {t('inviteEmail')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('inviteEmailPlaceholder')}
                className="w-full rounded-md border border-[var(--b2)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--dark)] placeholder:text-[var(--dark5)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--dark4)] uppercase tracking-wider mb-1">
                {t('inviteRole')}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-[var(--b2)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
              >
                <option value="admin">{t('admin')}</option>
                <option value="member">{t('member')}</option>
                <option value="viewer">{t('viewer')}</option>
              </select>
            </div>
            {error && <p className="text-sm text-[var(--coral)]">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('inviteCancel')}
          </Button>
          {!limitReached && (
            <Button onClick={handleSubmit} disabled={sending || !email.trim()}>
              {sending ? t('inviteSending') : t('inviteSend')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
