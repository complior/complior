'use client';

import { useTranslations } from 'next-intl';
import type { FRIASection } from '@/lib/api';

const SECTION_TYPES = [
  'general_info',
  'affected_persons',
  'specific_risks',
  'human_oversight',
  'mitigation_measures',
  'monitoring_plan',
] as const;

interface FRIAProgressProps {
  sections: FRIASection[];
  activeIndex: number;
  onNavigate: (index: number) => void;
}

export function FRIAProgress({ sections, activeIndex, onNavigate }: FRIAProgressProps) {
  const t = useTranslations('fria');

  return (
    <nav className="space-y-1">
      {SECTION_TYPES.map((type, i) => {
        const section = sections.find((s) => s.sectionType === type);
        const isActive = activeIndex === i;
        const isCompleted = section?.completed ?? false;

        return (
          <button
            key={type}
            onClick={() => onNavigate(i)}
            className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
              isActive
                ? 'border border-[var(--teal-glow)] bg-[var(--teal-dim)] text-[var(--teal)]'
                : 'border border-transparent hover:bg-[var(--bg2)] text-[var(--dark4)]'
            }`}
          >
            <span className={`flex-shrink-0 w-6 h-6 mt-0.5 rounded-full flex items-center justify-center text-[0.5625rem] font-bold border-2 ${
              isActive
                ? 'bg-[var(--teal)] border-[var(--teal)] text-white'
                : isCompleted
                  ? 'bg-[var(--teal-dim)] border-[var(--teal)] text-[var(--teal)]'
                  : 'bg-[var(--bg)] border-[var(--b2)] text-[var(--dark5)]'
            }`}>
              {isCompleted ? '\u2713' : i + 1}
            </span>
            <div className="min-w-0">
              <span className={`block text-[0.8125rem] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {t(`sections.${type}`)}
              </span>
              <span className="block text-[0.6875rem] text-[var(--dark5)] mt-0.5 leading-snug">
                {t(`sectionMeta.${type}.description`)}
              </span>
              <span className="block text-[0.625rem] font-mono text-[var(--dark6)] mt-0.5">
                {t(`sectionMeta.${type}.time`)}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
