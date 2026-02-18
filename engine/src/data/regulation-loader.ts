import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ConfigError } from '../types/errors.js';
import {
  ObligationsFileSchema,
  TechnicalRequirementsFileSchema,
  ScoringFileSchema,
  RegulationMetaFileSchema,
  ApplicabilityTreeFileSchema,
  CrossMappingFileSchema,
  LocalizationFileSchema,
  TimelineFileSchema,
  type ObligationsFile,
  type TechnicalRequirementsFile,
  type ScoringFile,
  type RegulationMetaFile,
  type ApplicabilityTreeFile,
  type CrossMappingFile,
  type LocalizationFile,
  type TimelineFile,
} from './schemas.js';

export interface RegulationData {
  readonly obligations: ObligationsFile;
  readonly technicalRequirements: TechnicalRequirementsFile;
  readonly scoring: ScoringFile;
  readonly regulationMeta: RegulationMetaFile;
  readonly applicabilityTree: ApplicabilityTreeFile;
  readonly crossMapping: CrossMappingFile;
  readonly localization: LocalizationFile;
  readonly timeline: TimelineFile;
}

const DATA_DIR = join(import.meta.dirname, '../../data/regulations/eu-ai-act');

const loadJsonFile = async (filename: string): Promise<unknown> => {
  const filePath = join(DATA_DIR, filename);
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`Failed to load ${filename}: ${message}`);
  }
};

let cachedData: RegulationData | null = null;

export const loadRegulationData = async (): Promise<RegulationData> => {
  if (cachedData !== null) {
    return cachedData;
  }

  const [
    obligationsRaw,
    technicalRequirementsRaw,
    scoringRaw,
    regulationMetaRaw,
    applicabilityTreeRaw,
    crossMappingRaw,
    localizationRaw,
    timelineRaw,
  ] = await Promise.all([
    loadJsonFile('obligations.json'),
    loadJsonFile('technical-requirements.json'),
    loadJsonFile('scoring.json'),
    loadJsonFile('regulation-meta.json'),
    loadJsonFile('applicability-tree.json'),
    loadJsonFile('cross-mapping.json'),
    loadJsonFile('localization.json'),
    loadJsonFile('timeline.json'),
  ]);

  const data: RegulationData = {
    obligations: ObligationsFileSchema.parse(obligationsRaw),
    technicalRequirements: TechnicalRequirementsFileSchema.parse(technicalRequirementsRaw),
    scoring: ScoringFileSchema.parse(scoringRaw),
    regulationMeta: RegulationMetaFileSchema.parse(regulationMetaRaw),
    applicabilityTree: ApplicabilityTreeFileSchema.parse(applicabilityTreeRaw),
    crossMapping: CrossMappingFileSchema.parse(crossMappingRaw),
    localization: LocalizationFileSchema.parse(localizationRaw),
    timeline: TimelineFileSchema.parse(timelineRaw),
  };

  cachedData = data;
  return data;
};

export const clearRegulationCache = (): void => {
  cachedData = null;
};
