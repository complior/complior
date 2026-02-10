'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { CATEGORY_LABELS } from './CatalogCard';

const RISK_LEVELS = [
  { value: '', label: 'Alle Risikostufen' },
  { value: 'high', label: 'Hochrisiko' },
  { value: 'limited', label: 'Begrenztes Risiko' },
  { value: 'minimal', label: 'Minimales Risiko' },
];

const CATEGORIES = [
  { value: '', label: 'Alle Kategorien' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];

interface CatalogSearchProps {
  onSearch: (params: { q: string; category: string; riskLevel: string }) => void;
  initialQ?: string;
  initialCategory?: string;
  initialRiskLevel?: string;
}

export function CatalogSearch({
  onSearch,
  initialQ = '',
  initialCategory = '',
  initialRiskLevel = '',
}: CatalogSearchProps) {
  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState(initialCategory);
  const [riskLevel, setRiskLevel] = useState(initialRiskLevel);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch({ q, category, riskLevel });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q, category, riskLevel, onSearch]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="AI Tool suchen..."
          className="pl-9"
        />
      </div>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <select
        value={riskLevel}
        onChange={(e) => setRiskLevel(e.target.value)}
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
      >
        {RISK_LEVELS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
    </div>
  );
}
