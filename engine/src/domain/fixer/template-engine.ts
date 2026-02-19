import { getTemplateMap } from './strategies.js';
import type { TemplateMapping } from './types.js';

export interface TemplateData {
  readonly companyName: string;
  readonly organization?: string;
  readonly aiSystems?: readonly string[];
  readonly riskLevel?: string;
  readonly date?: string;
  readonly version?: string;
}

const DEFAULT_DATA: TemplateData = {
  companyName: '[Company Name]',
  date: new Date().toISOString().slice(0, 10),
  version: '1.0',
};

export const fillTemplate = (templateContent: string, data?: Partial<TemplateData>): string => {
  const d = { ...DEFAULT_DATA, ...data };
  let filled = templateContent;

  filled = filled.replace(/\[Company Name\]/g, d.companyName);
  filled = filled.replace(/\[Firmenname\]/g, d.companyName);
  filled = filled.replace(/\[Date\]/g, d.date ?? '[TO BE SET]');
  filled = filled.replace(/\[X\.Y\]/g, d.version ?? '1.0');
  filled = filled.replace(/\[YYYY\]/g, new Date().getFullYear().toString());

  return filled;
};

export const getTemplateForObligation = (obligationId: string): TemplateMapping | undefined => {
  return getTemplateMap().find((m) => m.obligationId === obligationId);
};

export const getAvailableTemplates = (): readonly TemplateMapping[] => {
  return getTemplateMap();
};
