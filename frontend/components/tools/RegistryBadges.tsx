'use client';

const LIFECYCLE_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  suspended: { label: 'Suspended', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  decommissioned: { label: 'Decommissioned', className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const SOURCE_CONFIG: Record<string, { label: string; className: string }> = {
  manual: { label: 'Manual', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  cli_scan: { label: 'CLI', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  discovery: { label: 'Discovery', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  registry_autofill: { label: 'Registry', className: 'bg-teal-50 text-teal-700 border-teal-200' },
};

export function LifecycleBadge({ lifecycle }: { lifecycle: string }) {
  const config = LIFECYCLE_CONFIG[lifecycle] || LIFECYCLE_CONFIG.active;
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.manual;
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
