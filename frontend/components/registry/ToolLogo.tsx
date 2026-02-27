import React from 'react';

interface ToolLogoProps {
  name: string;
  size?: 'sm' | 'lg';
}

const GRADIENTS = [
  ['#10a37f', '#1a7f64'],
  ['#0078d4', '#005a9e'],
  ['#5865f2', '#404eed'],
  ['#d4a574', '#b8860b'],
  ['#4285f4', '#1a73e8'],
  ['#f97316', '#ea580c'],
  ['#ff4154', '#e91e63'],
  ['#2d3436', '#636e72'],
  ['#00d4aa', '#00b894'],
  ['#ff6b35', '#d63200'],
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function ToolLogo({ name, size = 'sm' }: ToolLogoProps) {
  const idx = hashName(name) % GRADIENTS.length;
  const [from, to] = GRADIENTS[idx];
  const px = size === 'lg' ? 64 : 36;
  const fontSize = size === 'lg' ? '1.5rem' : '.8125rem';
  const radius = size === 'lg' ? 14 : 8;

  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--f-display)',
        fontWeight: 800,
        fontSize,
        color: '#fff',
        flexShrink: 0,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
