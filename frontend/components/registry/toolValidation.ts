import type { RegistryTool } from '@/lib/registry';
import { getToolScore, getToolCoverage, getTransparencyGrade } from '@/lib/registry';

export interface ToolValidation {
  isComplete: boolean;
  hasScore: boolean;
  level: string;
  score: number | null;
  coverage: number | null;
  transparencyGrade: string | null;
  missingFields: string[];
}

export function validateTool(tool: RegistryTool): ToolValidation {
  const missingFields: string[] = [];
  const score = getToolScore(tool);
  const coverage = getToolCoverage(tool);
  const transparencyGrade = getTransparencyGrade(tool);
  const level = tool.level || 'classified';

  if (level === 'verified') {
    if (!tool.evidence || tool.evidence.length === 0) missingFields.push('evidence');
    if (score === null || score === undefined) missingFields.push('score');
    if (!tool.seo?.title) missingFields.push('seo.title');
    if (!tool.seo?.description) missingFields.push('seo.description');
    return {
      isComplete: missingFields.length === 0,
      hasScore: score !== null,
      level,
      score,
      coverage,
      transparencyGrade,
      missingFields,
    };
  }

  if (level === 'scanned') {
    if (!tool.assessments) missingFields.push('assessments');
    return {
      isComplete: false,
      hasScore: score !== null,
      level,
      score,
      coverage,
      transparencyGrade,
      missingFields,
    };
  }

  // classified
  if (!tool.riskLevel) missingFields.push('riskLevel');
  return {
    isComplete: false,
    hasScore: false,
    level,
    score: null,
    coverage: null,
    transparencyGrade: null,
    missingFields,
  };
}
