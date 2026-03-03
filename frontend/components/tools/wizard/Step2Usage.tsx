'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DOMAIN_KEYS = [
  'biometrics', 'critical_infrastructure', 'education', 'employment',
  'essential_services', 'law_enforcement', 'migration', 'justice',
  'customer_service', 'marketing', 'coding', 'analytics', 'other',
] as const;

const DOMAIN_I18N_MAP: Record<string, string> = {
  biometrics: 'Biometrics',
  critical_infrastructure: 'CriticalInfra',
  education: 'Education',
  employment: 'Employment',
  essential_services: 'EssentialServices',
  law_enforcement: 'LawEnforcement',
  migration: 'Migration',
  justice: 'Justice',
  customer_service: 'CustomerService',
  marketing: 'Marketing',
  coding: 'Coding',
  analytics: 'Analytics',
  other: 'Other',
};

interface Step2Data {
  purpose: string;
  domain: string;
}

interface Step2UsageProps {
  data: Step2Data;
  onChange: (data: Step2Data) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string[]>;
}

export function Step2Usage({ data, onChange, onNext, onBack, errors }: Step2UsageProps) {
  const t = useTranslations('wizard');

  return (
    <div>
      <div className="mb-1 font-display text-lg font-bold text-[var(--dark)]">{t('step2Title')}</div>
      <div className="text-[0.8125rem] text-[var(--dark5)] mb-6">{t('step2Subtitle')}</div>

      {/* Purpose */}
      <div className="mb-4">
        <label className="flex items-center gap-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[var(--dark4)] mb-1.5">
          {t('fieldPurpose')} <span className="text-[var(--coral)] text-[0.625rem]">*</span>
        </label>
        <textarea
          value={data.purpose}
          onChange={(e) => onChange({ ...data, purpose: e.target.value })}
          placeholder={t('placeholderPurpose')}
          rows={4}
          className="w-full px-3 py-2.5 border-[1.5px] border-[var(--b2)] rounded-lg font-body text-[0.8125rem] text-[var(--dark)] bg-[var(--bg)] outline-none transition-all focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-dim)] resize-y min-h-[80px] leading-relaxed placeholder:text-[var(--dark5)]"
        />
        {errors.purpose && <p className="mt-1 text-xs text-[var(--coral)]">{errors.purpose[0]}</p>}
      </div>

      {/* Domain */}
      <div className="mb-4">
        <label className="flex items-center gap-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[var(--dark4)] mb-1.5">
          {t('fieldDomain')} <span className="text-[var(--coral)] text-[0.625rem]">*</span>
        </label>
        {errors.domain && <p className="mb-2 text-xs text-[var(--coral)]">{errors.domain[0]}</p>}
        <div className="flex flex-col gap-1.5">
          {DOMAIN_KEYS.map((key) => {
            const i18nKey = DOMAIN_I18N_MAP[key];
            const selected = data.domain === key;
            return (
              <div
                key={key}
                onClick={() => onChange({ ...data, domain: key })}
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
                  <div className="text-[0.8125rem] font-semibold text-[var(--dark2)]">{t(`domain${i18nKey}`)}</div>
                  <div className="text-[0.6875rem] text-[var(--dark5)] mt-0.5">{t(`domain${i18nKey}Desc`)}</div>
                </div>
              </div>
            );
          })}
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
