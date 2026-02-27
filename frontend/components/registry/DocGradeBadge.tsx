'use client';

import React from 'react';
import { getGradeColor } from '@/lib/registry';

interface DocGradeBadgeProps {
  grade: string | null;
  size?: 'sm' | 'lg';
}

export function DocGradeBadge({ grade, size = 'sm' }: DocGradeBadgeProps) {
  const color = getGradeColor(grade);
  const isLg = size === 'lg';

  if (!grade) {
    return (
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: isLg ? '1.5rem' : '.5rem',
          fontWeight: 700,
          padding: isLg ? '.375rem .75rem' : '.125rem .375rem',
          borderRadius: isLg ? 8 : 4,
          background: 'var(--card2)',
          border: '1px solid var(--b)',
          color: 'var(--dark5)',
          minWidth: isLg ? 48 : 24,
          textAlign: 'center',
          display: 'inline-block',
        }}
      >
        —
      </span>
    );
  }

  return (
    <span
      style={{
        fontFamily: 'var(--f-mono)',
        fontSize: isLg ? '1.5rem' : '.5rem',
        fontWeight: 800,
        padding: isLg ? '.375rem .75rem' : '.125rem .375rem',
        borderRadius: isLg ? 8 : 4,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        color,
        minWidth: isLg ? 48 : 24,
        textAlign: 'center',
        display: 'inline-block',
        letterSpacing: isLg ? '-.01em' : 0,
      }}
    >
      {grade}
    </span>
  );
}
