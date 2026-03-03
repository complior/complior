'use client';

import { RequirementsList } from '@/components/classification/RequirementsList';
import type { ToolRequirement } from '@/lib/api';

interface ToolRequirementsProps {
  requirements: ToolRequirement[];
}

export function ToolRequirements({ requirements }: ToolRequirementsProps) {
  return <RequirementsList requirements={requirements} />;
}
