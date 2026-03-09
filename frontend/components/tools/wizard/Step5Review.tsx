'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, Shield } from 'lucide-react';

const DOMAIN_I18N_MAP: Record<string, string> = {
  biometrics: 'Biometrics', critical_infrastructure: 'CriticalInfra', education: 'Education',
  employment: 'Employment', essential_services: 'EssentialServices', law_enforcement: 'LawEnforcement',
  migration: 'Migration', justice: 'Justice', customer_service: 'CustomerService',
  marketing: 'Marketing', coding: 'Coding', analytics: 'Analytics', other: 'Other',
};

const DATA_TYPE_I18N_MAP: Record<string, string> = {
  personal: 'Personal', sensitive: 'Sensitive', biometric: 'Biometric', health: 'Health', financial: 'Financial',
};

const PERSON_I18N_MAP: Record<string, string> = {
  employees: 'Employees', customers: 'Customers', applicants: 'Applicants',
  patients: 'Patients', students: 'Students', public: 'Public',
};

const AUTONOMY_I18N_MAP: Record<string, string> = {
  L1: 'L1', L2: 'L2', L3: 'L3', L4: 'L4', L5: 'L5',
};

interface WizardData {
  name: string;
  vendorName: string;
  vendorCountry: string;
  vendorUrl: string;
  description: string;
  framework: string;
  modelProvider: string;
  modelId: string;
  purpose: string;
  domain: string;
  dataTypes: string[];
  affectedPersons: string[];
  vulnerableGroups: boolean;
  autonomyLevel: string;
  humanOversight: boolean;
  affectsNaturalPersons: boolean;
}

interface Step5ReviewProps {
  data: WizardData;
  onBack: () => void;
  onClassify: () => void;
  classifying: boolean;
}

export function Step5Review({ data, onBack, onClassify, classifying }: Step5ReviewProps) {
  const t = useTranslations('wizard');

  const domainLabel = DOMAIN_I18N_MAP[data.domain]
    ? t(`domain${DOMAIN_I18N_MAP[data.domain]}`) : data.domain;

  const autonomyLabel = AUTONOMY_I18N_MAP[data.autonomyLevel]
    ? t(`autonomy${AUTONOMY_I18N_MAP[data.autonomyLevel]}`) : data.autonomyLevel;

  return (
    <div>
      <div className="mb-1 font-display text-lg font-bold text-[var(--dark)]">{t('step5Title')}</div>
      <div className="text-[0.8125rem] text-[var(--dark5)] mb-6">{t('step5Subtitle')}</div>

      {/* AI Tool */}
      <SumGroup label={t('sectionToolInfo')}>
        <SumVal>
          <strong>{data.name}</strong> by {data.vendorName}
        </SumVal>
      </SumGroup>

      {/* Technical Stack */}
      {(data.framework || data.modelProvider || data.modelId) && (
        <SumGroup label={t('reviewTechStack')}>
          <div className="flex flex-wrap gap-1.5 p-2 bg-[var(--bg2)] rounded-md border border-[var(--b)]">
            {data.framework && (
              <span className="font-mono text-[0.5rem] px-1.5 py-0.5 rounded bg-[var(--bg3)] text-[var(--dark3)]">
                {data.framework}
              </span>
            )}
            {(data.modelProvider || data.modelId) && (
              <span className="font-mono text-[0.5rem] px-1.5 py-0.5 rounded bg-[var(--bg3)] text-[var(--dark3)]">
                {data.modelProvider}{data.modelProvider && data.modelId ? ' / ' : ''}{data.modelId}
              </span>
            )}
          </div>
        </SumGroup>
      )}

      {/* Purpose */}
      {data.purpose && (
        <SumGroup label={t('reviewPurpose')}>
          <SumVal>{data.purpose}</SumVal>
        </SumGroup>
      )}

      {/* Domain */}
      {data.domain && (
        <SumGroup label={t('reviewDomain')}>
          <SumVal>{domainLabel}</SumVal>
        </SumGroup>
      )}

      {/* Data Types */}
      {data.dataTypes.length > 0 && (
        <SumGroup label={t('reviewDataTypes')}>
          <div className="flex flex-wrap gap-1 p-2 bg-[var(--bg2)] rounded-md border border-[var(--b)]">
            {data.dataTypes.map((d) => (
              <span key={d} className="font-mono text-[0.5rem] px-1.5 py-0.5 rounded bg-[var(--bg3)] text-[var(--dark3)]">
                {DATA_TYPE_I18N_MAP[d] ? t(`data${DATA_TYPE_I18N_MAP[d]}`) : d}
              </span>
            ))}
          </div>
        </SumGroup>
      )}

      {/* Affected Persons */}
      {data.affectedPersons.length > 0 && (
        <SumGroup label={t('reviewAffectedPersons')}>
          <div className="flex flex-wrap gap-1 p-2 bg-[var(--bg2)] rounded-md border border-[var(--b)]">
            {data.affectedPersons.map((p) => (
              <span key={p} className="font-mono text-[0.5rem] px-1.5 py-0.5 rounded bg-[var(--bg3)] text-[var(--dark3)]">
                {PERSON_I18N_MAP[p] ? t(`person${PERSON_I18N_MAP[p]}`) : p}
              </span>
            ))}
          </div>
        </SumGroup>
      )}

      {/* Autonomy */}
      {data.autonomyLevel && (
        <SumGroup label={t('reviewAutonomyLevel')}>
          <SumVal>{autonomyLabel}</SumVal>
        </SumGroup>
      )}

      {/* Booleans */}
      <SumGroup label={t('reviewHumanOversight')}>
        <SumVal>{data.humanOversight ? t('yes') : t('no')}</SumVal>
      </SumGroup>

      <SumGroup label={t('reviewVulnerableGroups')}>
        <SumVal>{data.vulnerableGroups ? t('yes') : t('no')}</SumVal>
      </SumGroup>

      {/* Button row */}
      <div className="flex justify-between items-center mt-8 pt-5 border-t border-[var(--b)]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 font-body font-bold text-[0.8125rem] text-[var(--dark4)] bg-transparent border-none cursor-pointer hover:text-[var(--dark2)] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> {t('back')}
        </button>
        <button
          onClick={onClassify}
          disabled={classifying}
          className="inline-flex items-center gap-2 px-7 py-3 rounded-lg font-body font-bold text-[0.875rem] bg-[var(--teal)] text-white shadow-[0_2px_8px_var(--teal-glow)] hover:bg-[var(--teal2)] hover:-translate-y-px transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed dark:text-[var(--bg)]"
        >
          <Shield className="w-3.5 h-3.5" />
          {classifying ? t('classifying') : t('classifyNow')}
        </button>
      </div>
    </div>
  );
}

function SumGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="font-mono text-[0.4375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark5)] mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function SumVal({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.875rem] text-[var(--dark)] font-medium px-3 py-2 bg-[var(--bg2)] rounded-md border border-[var(--b)]">
      {children}
    </div>
  );
}
