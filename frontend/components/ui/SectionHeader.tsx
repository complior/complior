import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  label?: string;
  title: string;
  titleEm?: string;
  subtitle?: string;
  className?: string;
}

export function SectionHeader({ label, title, titleEm, subtitle, className }: SectionHeaderProps) {
  return (
    <div className={cn('text-center mb-12', className)}>
      {label && (
        <div className="font-mono text-[0.5625rem] font-medium uppercase tracking-[0.12em] text-teal mb-3">
          {label}
        </div>
      )}
      <h2 className="font-display text-[clamp(1.625rem,3vw,2.375rem)] font-bold text-[var(--dark)] mb-3 tracking-tight">
        {title}
        {titleEm && <em className="italic text-teal font-semibold"> {titleEm}</em>}
      </h2>
      {subtitle && (
        <p className="text-[0.9375rem] text-[var(--dark4)] max-w-[500px] mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
