'use client';

import { useTheme } from '@/app/providers';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'rounded-lg border border-[var(--b2)] bg-[var(--card)] px-3 py-1.5 font-mono text-[0.625rem] text-[var(--dark4)] transition-all hover:border-[var(--b3)] hover:text-[var(--dark2)]',
        className
      )}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
