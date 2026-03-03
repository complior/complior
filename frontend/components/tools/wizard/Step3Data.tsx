'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DATA_TYPE_KEYS = ['personal', 'sensitive', 'biometric', 'health', 'financial'] as const;

const DATA_TYPE_I18N_MAP: Record<string, string> = {
  personal: 'Personal',
  sensitive: 'Sensitive',
  biometric: 'Biometric',
  health: 'Health',
  financial: 'Financial',
};

const PERSON_KEYS = ['employees', 'customers', 'applicants', 'patients', 'students', 'public'] as const;

const PERSON_I18N_MAP: Record<string, string> = {
  employees: 'Employees',
  customers: 'Customers',
  applicants: 'Applicants',
  patients: 'Patients',
  students: 'Students',
  public: 'Public',
};

interface Step3Data {
  dataTypes: string[];
  affectedPersons: string[];
  vulnerableGroups: boolean;
}

interface Step3DataProps {
  data: Step3Data;
  onChange: (data: Step3Data) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string[]>;
}

export function Step3Data({ data, onChange, onNext, onBack, errors }: Step3DataProps) {
  const t = useTranslations('wizard');

  const toggleItem = (field: 'dataTypes' | 'affectedPersons', value: string) => {
    const current = data[field] as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...data, [field]: next });
  };

  return (
    <div>
      <div className="mb-1 font-display text-lg font-bold text-[var(--dark)]">{t('step3Title')}</div>
      <div className="text-[0.8125rem] text-[var(--dark5)] mb-6">{t('step3Subtitle')}</div>

      {/* Data Types */}
      <div className="mb-5">
        <label className="flex items-center gap-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[var(--dark4)] mb-1.5">
          {t('fieldDataTypes')} <span className="text-[var(--coral)] text-[0.625rem]">*</span>
        </label>
        {errors.dataTypes && <p className="mb-2 text-xs text-[var(--coral)]">{errors.dataTypes[0]}</p>}
        <div className="flex flex-col gap-1.5">
          {DATA_TYPE_KEYS.map((key) => {
            const i18nKey = DATA_TYPE_I18N_MAP[key];
            const selected = data.dataTypes.includes(key);
            return (
              <div
                key={key}
                onClick={() => toggleItem('dataTypes', key)}
                className={`
                  flex items-start gap-2.5 px-3 py-2 border-[1.5px] rounded-lg cursor-pointer transition-all
                  ${selected
                    ? 'border-[var(--teal)] bg-[var(--teal-dim)]'
                    : 'border-[var(--b2)] hover:border-[var(--teal)] hover:bg-[var(--teal-dim)]'
                  }
                `}
              >
                {/* Custom checkbox */}
                <div className={`
                  w-4 h-4 rounded flex-shrink-0 mt-0.5 border-2 flex items-center justify-center text-[0.5rem]
                  ${selected ? 'border-[var(--teal)] bg-[var(--teal)]' : 'border-[var(--b3)]'}
                `}>
                  {selected && <span className="text-white dark:text-[var(--bg)] font-bold leading-none">{'\u2713'}</span>}
                </div>
                <div className="text-[0.8125rem] font-semibold text-[var(--dark2)]">{t(`data${i18nKey}`)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Affected Persons */}
      <div className="mb-5">
        <label className="flex items-center gap-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[var(--dark4)] mb-1.5">
          {t('fieldAffectedPersons')} <span className="text-[var(--coral)] text-[0.625rem]">*</span>
        </label>
        {errors.affectedPersons && <p className="mb-2 text-xs text-[var(--coral)]">{errors.affectedPersons[0]}</p>}
        <div className="flex flex-col gap-1.5">
          {PERSON_KEYS.map((key) => {
            const i18nKey = PERSON_I18N_MAP[key];
            const selected = data.affectedPersons.includes(key);
            return (
              <div
                key={key}
                onClick={() => toggleItem('affectedPersons', key)}
                className={`
                  flex items-start gap-2.5 px-3 py-2 border-[1.5px] rounded-lg cursor-pointer transition-all
                  ${selected
                    ? 'border-[var(--teal)] bg-[var(--teal-dim)]'
                    : 'border-[var(--b2)] hover:border-[var(--teal)] hover:bg-[var(--teal-dim)]'
                  }
                `}
              >
                {/* Custom checkbox */}
                <div className={`
                  w-4 h-4 rounded flex-shrink-0 mt-0.5 border-2 flex items-center justify-center text-[0.5rem]
                  ${selected ? 'border-[var(--teal)] bg-[var(--teal)]' : 'border-[var(--b3)]'}
                `}>
                  {selected && <span className="text-white dark:text-[var(--bg)] font-bold leading-none">{'\u2713'}</span>}
                </div>
                <div className="text-[0.8125rem] font-semibold text-[var(--dark2)]">{t(`person${i18nKey}`)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vulnerable Groups Toggle */}
      <div className="mb-4">
        <label className="flex items-center gap-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[var(--dark4)] mb-1.5">
          {t('vulnerableGroups')}
        </label>
        <div
          onClick={() => onChange({ ...data, vulnerableGroups: !data.vulnerableGroups })}
          className={`
            flex items-center justify-between px-3 py-2.5 border-[1.5px] rounded-lg cursor-pointer transition-all
            ${data.vulnerableGroups
              ? 'border-[var(--teal)] bg-[var(--teal-dim)]'
              : 'border-[var(--b2)] hover:border-[var(--b3)]'
            }
          `}
        >
          <span className="text-[0.8125rem] font-semibold text-[var(--dark2)]">{t('vulnerableGroupsDesc')}</span>
          <div className={`w-9 h-5 rounded-[10px] relative transition-colors flex-shrink-0 ${data.vulnerableGroups ? 'bg-[var(--teal)]' : 'bg-[var(--bg3)]'}`}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-sm transition-all ${data.vulnerableGroups ? 'left-[18px]' : 'left-0.5'}`} />
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
