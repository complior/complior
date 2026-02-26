import React from 'react';

interface ScoreBarProps {
  score: number | null;
  size?: 'sm' | 'lg';
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'var(--dark5)';
  if (score < 30) return 'var(--coral)';
  if (score < 50) return 'var(--amber)';
  if (score < 70) return 'var(--blue)';
  return 'var(--teal)';
}

export function ScoreBar({ score, size = 'sm' }: ScoreBarProps) {
  const color = getScoreColor(score);
  const barHeight = size === 'lg' ? 6 : 4;
  const barWidth = size === 'lg' ? '100%' : 60;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', minWidth: size === 'sm' ? 100 : undefined }}>
      <span
        style={{
          fontFamily: 'var(--f-display)',
          fontSize: size === 'lg' ? '2.5rem' : '.875rem',
          fontWeight: size === 'lg' ? 800 : 700,
          color,
          minWidth: size === 'sm' ? 32 : undefined,
          textAlign: size === 'sm' ? 'right' : undefined,
          lineHeight: size === 'lg' ? 1 : undefined,
        }}
      >
        {score !== null ? score : '\u2014'}
      </span>
      {size === 'lg' && (
        <span style={{ fontSize: '1rem', color: 'var(--dark5)', fontWeight: 400 }}>/100</span>
      )}
      {size === 'sm' && (
        <div
          style={{
            width: barWidth,
            height: barHeight,
            background: 'var(--bg3)',
            borderRadius: barHeight / 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: score !== null ? `${score}%` : '0%',
              background: color,
              borderRadius: barHeight / 2,
            }}
          />
        </div>
      )}
    </div>
  );
}

// Separate large score bar for detail pages
export function ScoreBarLarge({ score }: { score: number | null }) {
  const color = getScoreColor(score);
  const isNull = score === null;
  return (
    <div>
      <div style={{
        height: 6,
        background: isNull
          ? 'repeating-linear-gradient(135deg, var(--bg3), var(--bg3) 4px, var(--card2) 4px, var(--card2) 8px)'
          : 'var(--bg3)',
        borderRadius: 3,
        margin: '.625rem 0 .375rem',
        overflow: 'hidden',
      }}>
        {!isNull && (
          <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3 }} />
        )}
      </div>
    </div>
  );
}
