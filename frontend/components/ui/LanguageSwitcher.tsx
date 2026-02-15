'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LOCALES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
] as const;

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLocale = (newLocale: string) => {
    // Replace the current locale prefix in the pathname
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-[5px] border border-[var(--b2)] px-2 py-1.5 font-mono text-[0.625rem] font-semibold text-[var(--dark4)] transition-all hover:border-[var(--b3)] hover:text-[var(--dark2)]"
      >
        {locale.toUpperCase()}
        <span className="text-[0.5rem] opacity-50">▾</span>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 z-[110] min-w-[130px] rounded-lg border border-[var(--b2)] bg-[var(--card)] p-1 shadow-[0_8px_24px_rgba(0,0,0,.08)]">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              className={cn(
                'flex w-full items-center gap-2 rounded-[5px] px-2.5 py-1.5 font-mono text-[0.5625rem] text-[var(--dark3)] transition-all hover:bg-[var(--bg2)] hover:text-[var(--dark)]',
                locale === l.code && 'font-bold text-teal'
              )}
            >
              <span>{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
