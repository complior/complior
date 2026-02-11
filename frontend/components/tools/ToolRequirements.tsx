'use client';

import { RequirementsList } from '@/components/classification/RequirementsList';
import type { ToolRequirement } from '@/lib/api';

interface ToolRequirementsProps {
  requirements: ToolRequirement[];
}

export function ToolRequirements({ requirements }: ToolRequirementsProps) {
  const completed = requirements.filter((r) => r.status === 'completed').length;
  const total = requirements.length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Compliance-Anforderungen</h3>
        {total > 0 && (
          <span className="text-sm text-slate-500">
            {completed}/{total} erledigt
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="mb-4 h-2 w-full rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-primary-600 transition-all"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>
      )}

      <RequirementsList requirements={requirements} />
    </div>
  );
}
