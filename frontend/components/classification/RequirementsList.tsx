'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import type { ToolRequirement } from '@/lib/api';

/* Category icons as inline SVGs matching the design */
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ai_literacy: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  human_oversight: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  deployer_obligations: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  transparency: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  fria: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  monitoring: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  data_governance: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  record_keeping: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  risk_management: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  registration: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  post_market_monitoring: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
    </svg>
  ),
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  en: {
    ai_literacy: 'AI Literacy',
    deployer_obligations: 'Deployer Obligations',
    fria: 'Fundamental Rights Impact Assessment',
    transparency: 'Transparency',
    human_oversight: 'Human Oversight',
    monitoring: 'Monitoring',
    risk_management: 'Risk Management',
    data_governance: 'Data Governance',
    record_keeping: 'Record Keeping',
    registration: 'Registration',
    post_market_monitoring: 'Post-Market Monitoring',
  },
  de: {
    ai_literacy: 'KI-Kompetenz',
    deployer_obligations: 'Betreiberpflichten',
    fria: 'Grundrechte-Folgenabsch\u00e4tzung',
    transparency: 'Transparenz',
    human_oversight: 'Menschliche Aufsicht',
    monitoring: '\u00dcberwachung',
    risk_management: 'Risikomanagement',
    data_governance: 'Datengovernance',
    record_keeping: 'Aufzeichnungspflicht',
    registration: 'Registrierung',
    post_market_monitoring: 'Post-Market-Monitoring',
  },
};

function getEffortClass(hours: number | null): string {
  if (!hours) return 'e-low';
  if (hours >= 16) return 'e-high';
  if (hours >= 4) return 'e-med';
  return 'e-low';
}

function getEffortLabel(hours: number | null): string {
  if (!hours) return '';
  if (hours >= 40) return `~${Math.round(hours / 40)} wks`;
  if (hours >= 8) return `~${Math.round(hours / 8)} wk${Math.round(hours / 8) > 1 ? 's' : ''}`;
  return `~${hours} days`;
}

const EFFORT_COLORS: Record<string, string> = {
  'e-low': 'bg-[rgba(5,150,105,0.08)] text-[#047857]',
  'e-med': 'bg-[rgba(217,119,6,0.08)] text-[#b45309]',
  'e-high': 'bg-[rgba(231,76,60,0.08)] text-[#c0392b]',
};

interface RequirementsListProps {
  requirements: ToolRequirement[];
}

export function RequirementsList({ requirements }: RequirementsListProps) {
  const t = useTranslations('toolDetail');
  const locale = useLocale();

  const getReqName = (req: ToolRequirement): string => {
    if (locale !== 'en') {
      const localized = req.translations?.[locale]?.name;
      if (localized) return localized;
    }
    return req.name;
  };

  const getReqDescription = (req: ToolRequirement): string => {
    if (locale !== 'en') {
      const localized = req.translations?.[locale]?.description;
      if (localized) return localized;
    }
    return req.description;
  };

  const getCategoryLabel = (category: string): string => {
    return CATEGORY_LABELS[locale]?.[category] ?? CATEGORY_LABELS.en[category] ?? category;
  };

  if (requirements.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--b2)] bg-[var(--card)] p-6 text-center">
        <p className="text-sm text-[var(--dark5)]">{t('notYetClassified')}</p>
      </div>
    );
  }

  // Group by category
  const grouped = requirements.reduce<Record<string, ToolRequirement[]>>((acc, req) => {
    const cat = req.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(req);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, reqs]) => (
        <div key={category} className="req-group">
          {/* Category header — design: req-cat */}
          <div className="flex items-center gap-1.5 font-mono text-[0.4375rem] font-bold uppercase tracking-[0.08em] text-[var(--dark4)] mb-2.5">
            {CATEGORY_ICONS[category] || CATEGORY_ICONS.deployer_obligations}
            {getCategoryLabel(category)}
          </div>

          {/* Requirement items — design: req */}
          <div className="space-y-1.5">
            {reqs.map((req) => {
              const isDone = req.status === 'completed';
              const isWip = req.status === 'in_progress';
              const effortClass = getEffortClass(req.estimatedEffortHours);
              const effortLabel = getEffortLabel(req.estimatedEffortHours);

              return (
                <div
                  key={req.toolRequirementId}
                  className="flex items-start gap-2.5 px-3.5 py-3 border border-[var(--b)] rounded-lg transition-colors hover:border-[var(--b3)] cursor-pointer"
                >
                  {/* Status icon — design: req-st */}
                  <div
                    className={`w-5 h-5 rounded-[5px] shrink-0 grid place-items-center text-[0.5rem] font-bold mt-0.5 ${
                      isDone
                        ? 'bg-[var(--teal-dim)] text-[var(--teal)] border-[1.5px] border-[var(--teal)]'
                        : isWip
                          ? 'bg-[rgba(217,119,6,0.08)] text-[var(--amber)] border-[1.5px] border-[rgba(217,119,6,0.2)]'
                          : 'bg-[var(--bg2)] text-[var(--dark5)] border-[1.5px] border-[var(--b2)]'
                    }`}
                  >
                    {isDone ? '\u2713' : isWip ? '\u27F3' : ''}
                  </div>

                  {/* Body — design: req-body */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[0.8125rem] font-semibold text-[var(--dark2)] mb-0.5 ${isDone ? 'line-through text-[var(--dark5)]' : ''}`}>
                      {getReqName(req)}
                    </div>
                    <div className="font-mono text-[0.4375rem] text-[var(--dark5)]">
                      <code className="bg-[var(--bg2)] px-1 py-0.5 rounded text-[var(--dark4)]">{req.articleReference}</code>
                      {isDone && req.completedAt && (
                        <span className="ml-1.5">
                          · Completed {new Date(req.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      {isWip && <span className="ml-1.5">· In progress</span>}
                    </div>
                  </div>

                  {/* Effort badge — design: effort */}
                  {effortLabel && (
                    <span className={`font-mono text-[0.375rem] font-bold uppercase tracking-[0.03em] px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${EFFORT_COLORS[effortClass]}`}>
                      {effortLabel}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
