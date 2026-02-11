'use client';

import { Badge } from '@/components/ui/Badge';
import type { ToolRequirement } from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; variant: 'secondary' | 'high' | 'limited' | 'minimal' }> = {
  pending: { label: 'Ausstehend', variant: 'secondary' },
  in_progress: { label: 'In Bearbeitung', variant: 'limited' },
  completed: { label: 'Erledigt', variant: 'minimal' },
  blocked: { label: 'Blockiert', variant: 'high' },
  not_applicable: { label: 'N/A', variant: 'secondary' },
};

const CATEGORY_LABELS: Record<string, string> = {
  ai_literacy: 'KI-Kompetenz',
  deployer_obligations: 'Betreiberpflichten',
  fria: 'Grundrechte-Folgenabschätzung',
  transparency: 'Transparenz',
  human_oversight: 'Menschliche Aufsicht',
  monitoring: 'Überwachung',
  risk_management: 'Risikomanagement',
  data_governance: 'Datenqualität',
  record_keeping: 'Protokollierung',
  registration: 'Registrierung',
  post_market_monitoring: 'Nachmarktüberwachung',
};

interface RequirementsListProps {
  requirements: ToolRequirement[];
}

export function RequirementsList({ requirements }: RequirementsListProps) {
  if (requirements.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">Keine Anforderungen zugeordnet. Klassifizieren Sie das Tool zuerst.</p>
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
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, reqs]) => (
        <div key={category} className="rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-2">
            <h4 className="text-sm font-semibold text-slate-700">
              {CATEGORY_LABELS[category] || category} ({reqs.length})
            </h4>
          </div>
          <div className="divide-y divide-slate-100">
            {reqs.map((req) => {
              const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              return (
                <div key={req.toolRequirementId} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">{req.articleReference}</span>
                      <p className="text-sm font-medium truncate">{req.name}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{req.description}</p>
                    {req.estimatedEffortHours && (
                      <p className="mt-0.5 text-xs text-slate-400">~{req.estimatedEffortHours}h Aufwand</p>
                    )}
                  </div>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
