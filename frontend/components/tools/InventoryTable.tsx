'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { RiskBadge } from './RiskBadge';
import { LifecycleBadge, SourceBadge } from './RegistryBadges';
import type { AITool } from '@/lib/api';

const DOMAIN_KEYS: Record<string, string> = {
  biometrics: 'Biometrics',
  critical_infrastructure: 'Critical Infrastructure',
  education: 'Education',
  employment: 'Employment',
  essential_services: 'Essential Services',
  law_enforcement: 'Law Enforcement',
  migration: 'Migration',
  justice: 'Justice',
  customer_service: 'Customer Service',
  marketing: 'Marketing',
  coding: 'Software Development',
  analytics: 'Analytics',
  other: 'Other',
};

interface InventoryTableProps {
  tools: AITool[];
}

export function InventoryTable({ tools }: InventoryTableProps) {
  const locale = useLocale();
  const t = useTranslations('toolDetail');

  const STATUS_LABELS: Record<string, string> = {
    not_started: t('statusNotStarted'),
    in_progress: t('statusInProgress'),
    review: t('statusReview'),
    compliant: t('statusCompliant'),
    non_compliant: t('statusNonCompliant'),
  };

  if (tools.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--b2)] bg-[var(--card)] p-8 text-center">
        <p className="text-[var(--dark5)] text-sm">No AI tools registered yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--b2)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg2)] text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-[var(--dark4)]">Name</th>
              <th className="px-4 py-3 font-medium text-[var(--dark4)]">Vendor</th>
              <th className="px-4 py-3 font-medium text-[var(--dark4)]">Domain</th>
              <th className="px-4 py-3 font-medium text-[var(--dark4)]">Risk</th>
              <th className="px-4 py-3 font-medium text-[var(--dark4)]">Lifecycle</th>
              <th className="px-4 py-3 font-medium text-[var(--dark4)]">Source</th>
              <th className="px-4 py-3 font-medium text-[var(--dark4)]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--b)]">
            {tools.map((tool) => (
              <tr key={tool.id} className="hover:bg-[var(--bg2)] transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/${locale}/tools/${tool.id}`} className="font-medium text-[var(--teal)] hover:underline">
                    {tool.name}
                  </Link>
                  {!tool.wizardCompleted && !tool.riskLevel && (
                    <span className="ml-2 text-xs text-[var(--dark5)]">(Draft)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--dark3)]">{tool.vendorName}</td>
                <td className="px-4 py-3 text-[var(--dark3)]">{DOMAIN_KEYS[tool.domain] || tool.domain}</td>
                <td className="px-4 py-3"><RiskBadge riskLevel={tool.riskLevel} /></td>
                <td className="px-4 py-3"><LifecycleBadge lifecycle={tool.lifecycle} /></td>
                <td className="px-4 py-3"><SourceBadge source={tool.source} /></td>
                <td className="px-4 py-3 text-[var(--dark3)]">{STATUS_LABELS[tool.complianceStatus] || tool.complianceStatus}</td>
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
            href={`/${locale}/tools/${tool.id}`}
            className="block rounded-xl border border-[var(--b2)] bg-[var(--card)] p-4 hover:border-[var(--teal)] transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-[var(--dark)]">{tool.name}</p>
                <p className="text-sm text-[var(--dark5)]">{tool.vendorName}</p>
              </div>
              <RiskBadge riskLevel={tool.riskLevel} />
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-[var(--dark5)]">
              <span>{DOMAIN_KEYS[tool.domain] || tool.domain}</span>
              <LifecycleBadge lifecycle={tool.lifecycle} />
              <SourceBadge source={tool.source} />
              {!tool.wizardCompleted && !tool.riskLevel && <span className="text-[var(--dark5)]">Draft</span>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
