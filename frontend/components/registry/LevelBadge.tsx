import React from 'react';

interface LevelBadgeProps {
  level: 'verified' | 'scanned' | 'classified';
}

const LEVEL_STYLES: Record<string, { bg: string; color: string }> = {
  verified: { bg: 'rgba(52,211,153,.08)', color: 'var(--teal)' },
  scanned: { bg: 'rgba(96,165,250,.1)', color: 'var(--blue)' },
  classified: { bg: 'var(--card2)', color: 'var(--dark4)' },
};

export function LevelBadge({ level }: LevelBadgeProps) {
  const styles = LEVEL_STYLES[level] || LEVEL_STYLES.classified;

  return (
    <span
      style={{
        fontFamily: 'var(--f-mono)',
        fontSize: '.5rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.04em',
        padding: '.125rem .4375rem',
        borderRadius: 100,
        background: styles.bg,
        color: styles.color,
      }}
    >
      {level}
    </span>
  );
}
