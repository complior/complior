'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';

const RISK_KEYS = ['prohibited', 'high', 'gpai', 'limited', 'minimal'] as const;
const RISK_I18N: Record<string, string> = {
  prohibited: 'filterProhibited',
  high: 'filterHighRisk',
  gpai: 'filterGPAI',
  limited: 'filterLimited',
  minimal: 'filterMinimal',
};

const STATUS_KEYS = ['not_started', 'in_progress', 'review', 'compliant', 'non_compliant'] as const;
const STATUS_I18N: Record<string, string> = {
  not_started: 'statusNotStarted',
  in_progress: 'statusInProgress',
  review: 'statusReview',
  compliant: 'statusCompliant',
  non_compliant: 'statusNonCompliant',
};

const LIFECYCLE_KEYS = ['active', 'suspended', 'decommissioned'] as const;
const LIFECYCLE_LABELS: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspended',
  decommissioned: 'Decommissioned',
};

const SOURCE_KEYS = ['manual', 'cli_scan', 'discovery', 'registry_autofill'] as const;
const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  cli_scan: 'CLI Scan',
  discovery: 'Discovery',
  registry_autofill: 'Registry',
};

const DOMAIN_KEYS = [
  'biometrics', 'critical_infrastructure', 'education', 'employment',
  'essential_services', 'law_enforcement', 'migration', 'justice',
  'customer_service', 'marketing', 'coding', 'analytics', 'other',
] as const;

interface InventoryFiltersProps {
  onFilter: (params: { q: string; riskLevel: string; domain: string; status: string; lifecycle: string; source: string }) => void;
}

export function InventoryFilters({ onFilter }: InventoryFiltersProps) {
  const t = useTranslations('toolDetail');
  const tw = useTranslations('wizard');
  const [q, setQ] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState('');
  const [lifecycle, setLifecycle] = useState('');
  const [source, setSource] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilter({ q, riskLevel, domain, status, lifecycle, source });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q, riskLevel, domain, status, lifecycle, source, onFilter]);

  const selectClass = 'h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="pl-9"
        />
      </div>
      <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} className={selectClass}>
        <option value="">{t('filterAllRisk')}</option>
        {RISK_KEYS.map((key) => (
          <option key={key} value={key}>{t(RISK_I18N[key] as 'filterProhibited')}</option>
        ))}
      </select>
      <select value={domain} onChange={(e) => setDomain(e.target.value)} className={selectClass}>
        <option value="">{t('filterAllDomains')}</option>
        {DOMAIN_KEYS.map((key) => {
          const i18nMap: Record<string, string> = {
            biometrics: 'Biometrics', critical_infrastructure: 'CriticalInfra', education: 'Education',
            employment: 'Employment', essential_services: 'EssentialServices', law_enforcement: 'LawEnforcement',
            migration: 'Migration', justice: 'Justice', customer_service: 'CustomerService',
            marketing: 'Marketing', coding: 'Coding', analytics: 'Analytics', other: 'Other',
          };
          return (
            <option key={key} value={key}>{tw(`domain${i18nMap[key]}`)}</option>
          );
        })}
      </select>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
        <option value="">{t('filterAllStatus')}</option>
        {STATUS_KEYS.map((key) => (
          <option key={key} value={key}>{t(STATUS_I18N[key] as 'statusNotStarted')}</option>
        ))}
      </select>
      <select value={lifecycle} onChange={(e) => setLifecycle(e.target.value)} className={selectClass}>
        <option value="">All Lifecycle</option>
        {LIFECYCLE_KEYS.map((key) => (
          <option key={key} value={key}>{LIFECYCLE_LABELS[key]}</option>
        ))}
      </select>
      <select value={source} onChange={(e) => setSource(e.target.value)} className={selectClass}>
        <option value="">All Sources</option>
        {SOURCE_KEYS.map((key) => (
          <option key={key} value={key}>{SOURCE_LABELS[key]}</option>
        ))}
      </select>
    </div>
  );
}
