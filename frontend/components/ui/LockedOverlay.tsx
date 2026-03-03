'use client';

import { Lock } from 'lucide-react';

interface LockedOverlayProps {
  title: string;
  description?: string;
  sprint?: string;
}

export function LockedOverlay({ title, description, sprint }: LockedOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--card)]/80 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-2 text-center px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg2)]">
          <Lock className="h-5 w-5 text-[var(--dark5)]" />
        </div>
        <p className="text-sm font-semibold text-[var(--dark3)]">{title}</p>
        {description && (
          <p className="text-xs text-[var(--dark5)] max-w-xs">{description}</p>
        )}
        {sprint && (
          <span className="mt-1 inline-block rounded-full bg-[var(--bg2)] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[var(--dark4)]">
            {sprint}
          </span>
        )}
      </div>
    </div>
  );
}
