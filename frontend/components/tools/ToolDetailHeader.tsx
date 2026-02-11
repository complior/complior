'use client';

import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { RiskBadge } from './RiskBadge';
import { Button } from '@/components/ui/Button';
import type { AIToolDetail } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Nicht gestartet',
  in_progress: 'In Bearbeitung',
  review: 'Prüfung',
  compliant: 'Konform',
  non_compliant: 'Nicht konform',
};

interface ToolDetailHeaderProps {
  tool: AIToolDetail;
  onDelete: () => void;
  deleting: boolean;
}

export function ToolDetailHeader({ tool, onDelete, deleting }: ToolDetailHeaderProps) {
  return (
    <div>
      <Link href="/tools/inventory" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Inventar
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{tool.name}</h1>
            <RiskBadge riskLevel={tool.riskLevel} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {tool.vendorName}
            {tool.vendorCountry && ` (${tool.vendorCountry})`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Bearbeiten
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {deleting ? 'Löschen...' : 'Löschen'}
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Risikostufe"
          value={tool.riskLevel || 'Nicht klassifiziert'}
        />
        <MetricCard
          label="Compliance-Status"
          value={STATUS_LABELS[tool.complianceStatus] || tool.complianceStatus}
        />
        <MetricCard
          label="Konfidenz"
          value={tool.classificationConfidence ? `${tool.classificationConfidence}%` : '—'}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
