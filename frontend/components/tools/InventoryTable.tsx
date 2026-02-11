'use client';

import Link from 'next/link';
import { RiskBadge } from './RiskBadge';
import type { AITool } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Nicht gestartet',
  in_progress: 'In Bearbeitung',
  review: 'Prüfung',
  compliant: 'Konform',
  non_compliant: 'Nicht konform',
};

const DOMAIN_LABELS: Record<string, string> = {
  biometrics: 'Biometrie',
  critical_infrastructure: 'Krit. Infrastruktur',
  education: 'Bildung',
  employment: 'Beschäftigung',
  essential_services: 'Grundl. Dienste',
  law_enforcement: 'Strafverfolgung',
  migration: 'Migration',
  justice: 'Justiz',
  customer_service: 'Kundenservice',
  marketing: 'Marketing',
  coding: 'Softwareentwicklung',
  analytics: 'Analytik',
  other: 'Sonstiges',
};

interface InventoryTableProps {
  tools: AITool[];
}

export function InventoryTable({ tools }: InventoryTableProps) {
  if (tools.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-500">Keine AI Tools registriert. Registrieren Sie Ihr erstes AI Tool.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 font-medium text-slate-600">Anbieter</th>
              <th className="px-4 py-3 font-medium text-slate-600">Bereich</th>
              <th className="px-4 py-3 font-medium text-slate-600">Risiko</th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 font-medium text-slate-600">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {tools.map((tool) => (
              <tr key={tool.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/tools/${tool.id}`} className="font-medium text-primary-600 hover:underline">
                    {tool.name}
                  </Link>
                  {!tool.wizardCompleted && (
                    <span className="ml-2 text-xs text-amber-600">(Entwurf)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{tool.vendorName}</td>
                <td className="px-4 py-3 text-slate-600">{DOMAIN_LABELS[tool.domain] || tool.domain}</td>
                <td className="px-4 py-3"><RiskBadge riskLevel={tool.riskLevel} /></td>
                <td className="px-4 py-3 text-slate-600">{STATUS_LABELS[tool.complianceStatus] || tool.complianceStatus}</td>
                <td className="px-4 py-3 text-slate-600">{tool.complianceScore}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            href={`/tools/${tool.id}`}
            className="block rounded-md border border-slate-200 bg-white p-4 hover:border-primary-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{tool.name}</p>
                <p className="text-sm text-slate-500">{tool.vendorName}</p>
              </div>
              <RiskBadge riskLevel={tool.riskLevel} />
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              <span>{DOMAIN_LABELS[tool.domain] || tool.domain}</span>
              <span>{STATUS_LABELS[tool.complianceStatus] || tool.complianceStatus}</span>
              {!tool.wizardCompleted && <span className="text-amber-600">Entwurf</span>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
