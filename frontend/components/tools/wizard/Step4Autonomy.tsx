'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AUTONOMY_KEYS = ['advisory', 'semi_autonomous', 'autonomous'] as const;

const AUTONOMY_I18N_MAP: Record<string, string> = {
  advisory: 'Advisory',
  semi_autonomous: 'SemiAutonomous',
  autonomous: 'Autonomous',
};

interface Step4Data {
  autonomyLevel: string;
  humanOversight: boolean;
  affectsNaturalPersons: boolean;
}

interface Step4AutonomyProps {
  data: Step4Data;
  onChange: (data: Step4Data) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string[]>;
}

export function Step4Autonomy({ data, onChange, onNext, onBack, errors }: Step4AutonomyProps) {
  const t = useTranslations('wizard');

  return (
    <div>
      <div className="mb-1 font-display text-lg font-bold text-[var(--dark)]">{t('step4Title')}</div>
      <div className="text-[0.8125rem] text-[var(--dark5)] mb-6">{t('step4Subtitle')}</div>

      {/* Autonomy Level */}
      <div className="mb-5">
        <label className="flex items-center gap-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[var(--dark4)] mb-1.5">
          {t('fieldAutonomyLevel')} <span className="text-[var(--coral)] text-[0.625rem]">*</span>
        </label>
        {errors.autonomyLevel && <p className="mb-2 text-xs text-[var(--coral)]">{errors.autonomyLevel[0]}</p>}
        <div className="flex flex-col gap-1.5">
          {AUTONOMY_KEYS.map((key) => {
            const i18nKey = AUTONOMY_I18N_MAP[key];
            const selected = data.autonomyLevel === key;
            return (
              <div
                key={key}
                onClick={() => onChange({ ...data, autonomyLevel: key })}
                className={`
                  flex items-start gap-2.5 px-3 py-2 border-[1.5px] rounded-lg cursor-pointer transition-all
                  ${selected
                    ? 'border-[var(--teal)] bg-[var(--teal-dim)]'
                    : 'border-[var(--b2)] hover:border-[var(--teal)] hover:bg-[var(--teal-dim)]'
                  }
                `}
              >
                {/* Custom radio dot */}
                <div className={`
                  w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center
                  ${selected ? 'border-[var(--teal)] bg-[var(--teal)]' : 'border-[var(--b3)]'}
                `}>
                  {selected && <div className="w-[5px] h-[5px] rounded-full bg-white dark:bg-[var(--bg)]" />}
                </div>
                <div>
                  <div className="text-[0.8125rem] font-semibold text-[var(--dark2)]">{t(`autonomy${i18nKey}`)}</div>
                  <div className="text-[0.6875rem] text-[var(--dark5)] mt-0.5">{t(`autonomy${i18nKey}Desc`)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Human Oversight Toggle */}
      <div className="mb-3">
        <div
          onClick={() => onChange({ ...data, humanOversight: !data.humanOversight })}
          className={`
            flex items-center justify-between px-3 py-2.5 border-[1.5px] rounded-lg cursor-pointer transition-all
            ${data.humanOversight
              ? 'border-[var(--teal)] bg-[var(--teal-dim)]'
              : 'border-[var(--b2)] hover:border-[var(--b3)]'
            }
          `}
        >
          <span className="text-[0.8125rem] font-semibold text-[var(--dark2)] flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--dark5)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            {t('humanOversight')}
          </span>
          <div className={`w-9 h-5 rounded-[10px] relative transition-colors flex-shrink-0 ${data.humanOversight ? 'bg-[var(--teal)]' : 'bg-[var(--bg3)]'}`}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-sm transition-all ${data.humanOversight ? 'left-[18px]' : 'left-0.5'}`} />
          </div>
        </div>
      </div>

      {/* Affects Natural Persons Toggle */}
      <div className="mb-4">
        <div
          onClick={() => onChange({ ...data, affectsNaturalPersons: !data.affectsNaturalPersons })}
          className={`
            flex items-center justify-between px-3 py-2.5 border-[1.5px] rounded-lg cursor-pointer transition-all
            ${data.affectsNaturalPersons
              ? 'border-[var(--teal)] bg-[var(--teal-dim)]'
              : 'border-[var(--b2)] hover:border-[var(--b3)]'
            }
          `}
        >
          <span className="text-[0.8125rem] font-semibold text-[var(--dark2)] flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--dark5)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            {t('affectsNaturalPersons')}
          </span>
          <div className={`w-9 h-5 rounded-[10px] relative transition-colors flex-shrink-0 ${data.affectsNaturalPersons ? 'bg-[var(--teal)]' : 'bg-[var(--bg3)]'}`}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-sm transition-all ${data.affectsNaturalPersons ? 'left-[18px]' : 'left-0.5'}`} />
          </div>
        </div>
      </div>

      {/* Button row */}
      <div className="flex justify-between items-center mt-8 pt-5 border-t border-[var(--b)]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 font-body font-bold text-[0.8125rem] text-[var(--dark4)] bg-transparent border-none cursor-pointer hover:text-[var(--dark2)] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> {t('back')}
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-body font-bold text-[0.8125rem] bg-[var(--teal)] text-white shadow-[0_2px_8px_var(--teal-glow)] hover:bg-[var(--teal2)] hover:-translate-y-px transition-all cursor-pointer border-none dark:text-[var(--bg)]"
        >
          {t('next')} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
