'use client';

import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';

interface Step1Data {
  name: string;
  vendorName: string;
  vendorCountry: string;
  vendorUrl: string;
  description: string;
}

interface Step1ToolProps {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
  onNext: () => void;
  errors: Record<string, string[]>;
}

export function Step1Tool({ data, onChange, onNext, errors }: Step1ToolProps) {
  const t = useTranslations('wizard');

  const update = (field: keyof Step1Data, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div>
      <div className="mb-1 font-display text-lg font-bold text-[var(--dark)]">{t('step1Title')}</div>
      <div className="text-[0.8125rem] text-[var(--dark5)] mb-6">{t('step1Subtitle')}</div>

      {/* Name + Vendor row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="flex items-center gap-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[var(--dark4)] mb-1.5">
            {t('fieldName')} <span className="text-[var(--coral)] text-[0.625rem]">*</span>
          </label>
          <input
            value={data.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder={t('placeholderName')}
            className="w-full px-3 py-2.5 border-[1.5px] border-[var(--b2)] rounded-lg font-body text-[0.8125rem] text-[var(--dark)] bg-[var(--bg)] outline-none transition-all focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-dim)] placeholder:text-[var(--dark5)]"
          />
          {errors.name && <p className="mt-1 text-xs text-[var(--coral)]">{errors.name[0]}</p>}
        </div>
        <div>
          <label className="flex items-center gap-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[var(--dark4)] mb-1.5">
            {t('fieldVendor')} <span className="text-[var(--coral)] text-[0.625rem]">*</span>
          </label>
          <input
            value={data.vendorName}
            onChange={(e) => update('vendorName', e.target.value)}
            placeholder={t('placeholderVendor')}
            className="w-full px-3 py-2.5 border-[1.5px] border-[var(--b2)] rounded-lg font-body text-[0.8125rem] text-[var(--dark)] bg-[var(--bg)] outline-none transition-all focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-dim)] placeholder:text-[var(--dark5)]"
          />
          {errors.vendorName && <p className="mt-1 text-xs text-[var(--coral)]">{errors.vendorName[0]}</p>}
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="flex items-center gap-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[var(--dark4)] mb-1.5">
          {t('fieldDescription')}
        </label>
        <textarea
          value={data.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder={t('placeholderDescription')}
          rows={3}
          className="w-full px-3 py-2.5 border-[1.5px] border-[var(--b2)] rounded-lg font-body text-[0.8125rem] text-[var(--dark)] bg-[var(--bg)] outline-none transition-all focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-dim)] resize-y min-h-[80px] leading-relaxed placeholder:text-[var(--dark5)]"
        />
      </div>

      {/* Website */}
      <div className="mb-4">
        <label className="flex items-center gap-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[var(--dark4)] mb-1.5">
          {t('fieldWebsite')}
        </label>
        <input
          value={data.vendorUrl}
          onChange={(e) => update('vendorUrl', e.target.value)}
          placeholder={t('placeholderWebsite')}
          className="w-full px-3 py-2.5 border-[1.5px] border-[var(--b2)] rounded-lg font-body text-[0.8125rem] text-[var(--dark)] bg-[var(--bg)] outline-none transition-all focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-dim)] placeholder:text-[var(--dark5)]"
        />
      </div>

      {/* Button row */}
      <div className="flex justify-end items-center mt-8 pt-5 border-t border-[var(--b)]">
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
