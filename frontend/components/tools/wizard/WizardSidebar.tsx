'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, Check, RotateCw } from 'lucide-react';
import { RiskBadge } from '@/components/tools/RiskBadge';
import { api, type AITool } from '@/lib/api';

export function WizardSidebar() {
  const t = useTranslations('wizard');
  const locale = useLocale();
  const [tools, setTools] = useState<AITool[]>([]);

  useEffect(() => {
    api.tools.list({ page: '1', pageSize: '20' })
      .then((res) => setTools(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="hidden lg:block sticky top-[4.5rem] h-fit max-h-[calc(100vh-5rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-base font-bold text-[var(--dark)]">{t('existingTools')}</span>
        <span className="font-mono text-[0.5rem] bg-[var(--bg3)] text-[var(--dark4)] px-1.5 py-0.5 rounded">{tools.length}</span>
      </div>

      {tools.length === 0 ? (
        <div className="text-center py-8 px-4 text-[var(--dark5)] text-[0.8125rem]">
          <svg className="w-8 h-8 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="var(--dark5)" strokeWidth="1.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          {t('existingToolsEmpty')}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              href={`/${locale}/tools/${tool.id}`}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[var(--b)] bg-[var(--card)] hover:border-[var(--teal)] hover:bg-[var(--teal-dim)] transition-all no-underline"
            >
              <div className={`
                w-[18px] h-[18px] rounded-full flex items-center justify-center text-[0.5rem] flex-shrink-0
                ${tool.wizardCompleted
                  ? 'bg-[var(--teal-dim)] text-[var(--teal)]'
                  : 'bg-[rgba(217,119,6,0.1)] text-[var(--amber)]'
                }
              `}>
                {tool.wizardCompleted ? <Check className="w-2.5 h-2.5" /> : <RotateCw className="w-2.5 h-2.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.8125rem] font-semibold text-[var(--dark)] truncate">{tool.name}</div>
                <div className="text-[0.6875rem] text-[var(--dark5)]">{tool.vendorName}</div>
              </div>
              <RiskBadge riskLevel={tool.riskLevel} />
            </Link>
          ))}
        </div>
      )}

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="w-full mt-3 py-2 rounded-lg border-[1.5px] border-dashed border-[var(--b2)] bg-transparent text-[var(--dark4)] font-body text-[0.75rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all hover:border-[var(--teal)] hover:text-[var(--teal)] hover:bg-[var(--teal-dim)]"
      >
        <Plus className="w-3.5 h-3.5" /> {t('addAnotherTool')}
      </button>
    </div>
  );
}
