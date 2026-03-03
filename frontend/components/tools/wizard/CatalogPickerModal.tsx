'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { api, type CatalogTool } from '@/lib/api';
import { RiskBadge } from '@/components/tools/RiskBadge';

const CATEGORY_CHIPS = [
  { key: '', label: 'All' },
  { key: 'general', label: 'General' },
  { key: 'hr', label: 'HR' },
  { key: 'healthcare', label: 'Healthcare' },
  { key: 'finance', label: 'Finance' },
  { key: 'education', label: 'Education' },
  { key: 'legal', label: 'Legal' },
  { key: 'code', label: 'Code' },
  { key: 'content', label: 'Content' },
];

interface CatalogPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tool: CatalogTool) => void;
}

export function CatalogPickerModal({ open, onOpenChange, onSelect }: CatalogPickerModalProps) {
  const t = useTranslations('wizard');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<CatalogTool[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.catalog.search({ q: query, category, pageSize: '24' })
      .then((res) => setResults(res.data))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [open, query, category]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-8"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <div className="bg-[var(--card)] border border-[var(--b2)] rounded-[14px] w-full max-w-[720px] max-h-[80vh] flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--b)]">
          <span className="font-display text-base font-bold text-[var(--dark)]">{t('catalogTitle')}</span>
          <button onClick={() => onOpenChange(false)} className="bg-transparent border-none cursor-pointer text-[var(--dark5)] hover:text-[var(--dark)] transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-[var(--b)]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('catalogSearch')}
            autoFocus
            className="w-full px-3 py-2 border-[1.5px] border-[var(--b2)] rounded-lg font-body text-[0.8125rem] text-[var(--dark)] bg-[var(--bg)] outline-none focus:border-[var(--teal)] placeholder:text-[var(--dark5)]"
          />
        </div>

        {/* Category chips */}
        <div className="px-6 py-2.5 border-b border-[var(--b)] flex gap-1.5 flex-wrap">
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setCategory(chip.key)}
              className={`
                font-mono text-[0.4375rem] font-semibold px-2 py-1 rounded-[5px] border cursor-pointer transition-all
                ${category === chip.key
                  ? 'border-[var(--teal)] text-[var(--teal)] bg-[var(--teal-dim)]'
                  : 'border-[var(--b2)] text-[var(--dark4)] bg-transparent hover:border-[var(--teal)] hover:text-[var(--teal)] hover:bg-[var(--teal-dim)]'
                }
              `}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Results grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {loading ? (
            <div className="text-[var(--dark5)] text-sm text-center py-8">Loading...</div>
          ) : results.length === 0 ? (
            <div className="text-[var(--dark5)] text-sm text-center py-8">{t('catalogNoResults')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {results.map((tool) => (
                <div
                  key={tool.id}
                  onClick={() => { onSelect(tool); onOpenChange(false); }}
                  className="p-3 border-[1.5px] border-[var(--b2)] rounded-lg cursor-pointer transition-all hover:border-[var(--teal)] hover:bg-[var(--teal-dim)]"
                >
                  <div className="text-[0.8125rem] font-bold text-[var(--dark)] mb-0.5">{tool.name}</div>
                  <div className="text-[0.6875rem] text-[var(--dark5)] mb-1.5">{tool.vendor}</div>
                  {tool.description && (
                    <div className="text-[0.6875rem] text-[var(--dark4)] leading-snug mb-2 line-clamp-2">{tool.description}</div>
                  )}
                  <div className="flex items-center justify-between">
                    <RiskBadge riskLevel={tool.defaultRiskLevel} />
                    <span className="font-mono text-[0.4375rem] text-[var(--teal)] font-bold uppercase tracking-[0.04em]">
                      Select &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
