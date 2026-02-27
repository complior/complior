import type { RegistryTool } from '@/lib/registry';
import { getToolGrade, getToolScore, getToolCoverage, getTransparencyGrade, getPublicDocumentation } from '@/lib/registry';

export interface ToolValidation {
  isComplete: boolean;
  hasGrade: boolean;
  hasScore: boolean;
  level: string;
  grade: string | null;
  score: number | null;
  coverage: number | null;
  transparencyGrade: string | null;
  missingFields: string[];
}

export function validateTool(tool: RegistryTool): ToolValidation {
  const missingFields: string[] = [];
  const grade = getToolGrade(tool);
  const score = getToolScore(tool);
  const coverage = getToolCoverage(tool);
  const transparencyGrade = getTransparencyGrade(tool);
  const level = tool.level || 'classified';

  if (level === 'verified') {
    if (!tool.evidence || (Array.isArray(tool.evidence) && tool.evidence.length === 0)) missingFields.push('evidence');
    if (!grade) missingFields.push('grade');
    if (!tool.seo?.title) missingFields.push('seo.title');
    if (!tool.seo?.description) missingFields.push('seo.description');
    return {
      isComplete: missingFields.length === 0,
      hasGrade: grade !== null,
      hasScore: score !== null,
      level,
      grade,
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
      hasGrade: grade !== null,
      hasScore: score !== null,
      level,
      grade,
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
    hasGrade: false,
    hasScore: false,
    level,
    grade: null,
    score: null,
    coverage: null,
    transparencyGrade: null,
    missingFields,
  };
}
