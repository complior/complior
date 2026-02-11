'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';

const RISK_LEVELS = [
  { value: '', label: 'Alle Risikostufen' },
  { value: 'prohibited', label: 'Verboten' },
  { value: 'high', label: 'Hochrisiko' },
  { value: 'gpai', label: 'GPAI' },
  { value: 'limited', label: 'Begrenztes Risiko' },
  { value: 'minimal', label: 'Minimales Risiko' },
];

const COMPLIANCE_STATUSES = [
  { value: '', label: 'Alle Status' },
  { value: 'not_started', label: 'Nicht gestartet' },
  { value: 'in_progress', label: 'In Bearbeitung' },
  { value: 'review', label: 'Prüfung' },
  { value: 'compliant', label: 'Konform' },
  { value: 'non_compliant', label: 'Nicht konform' },
];

const DOMAINS = [
  { value: '', label: 'Alle Bereiche' },
  { value: 'biometrics', label: 'Biometrie' },
  { value: 'critical_infrastructure', label: 'Kritische Infrastruktur' },
  { value: 'education', label: 'Bildung' },
  { value: 'employment', label: 'Beschäftigung' },
  { value: 'essential_services', label: 'Grundlegende Dienste' },
  { value: 'law_enforcement', label: 'Strafverfolgung' },
  { value: 'migration', label: 'Migration' },
  { value: 'justice', label: 'Justiz' },
  { value: 'customer_service', label: 'Kundenservice' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'coding', label: 'Softwareentwicklung' },
  { value: 'analytics', label: 'Analytik' },
  { value: 'other', label: 'Sonstiges' },
];

interface InventoryFiltersProps {
  onFilter: (params: { q: string; riskLevel: string; domain: string; status: string }) => void;
}

export function InventoryFilters({ onFilter }: InventoryFiltersProps) {
  const [q, setQ] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilter({ q, riskLevel, domain, status });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q, riskLevel, domain, status, onFilter]);

  const selectClass = 'h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="AI Tool suchen..."
          className="pl-9"
        />
      </div>
      <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} className={selectClass}>
        {RISK_LEVELS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <select value={domain} onChange={(e) => setDomain(e.target.value)} className={selectClass}>
        {DOMAINS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
      </select>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
        {COMPLIANCE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </div>
  );
}
