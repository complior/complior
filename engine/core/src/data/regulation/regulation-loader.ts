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
} from '../schemas/schemas.js';
import { REGULATION_RAW } from './regulation-data.js';

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

let cachedData: RegulationData | null = null;

export const loadRegulationData = async (): Promise<RegulationData> => {
  if (cachedData !== null) {
    return cachedData;
  }

  const data: RegulationData = {
    obligations: ObligationsFileSchema.parse(REGULATION_RAW.obligations),
    technicalRequirements: TechnicalRequirementsFileSchema.parse(REGULATION_RAW.technicalRequirements),
    scoring: ScoringFileSchema.parse(REGULATION_RAW.scoring),
    regulationMeta: RegulationMetaFileSchema.parse(REGULATION_RAW.regulationMeta),
    applicabilityTree: ApplicabilityTreeFileSchema.parse(REGULATION_RAW.applicabilityTree),
    crossMapping: CrossMappingFileSchema.parse(REGULATION_RAW.crossMapping),
    localization: LocalizationFileSchema.parse(REGULATION_RAW.localization),
    timeline: TimelineFileSchema.parse(REGULATION_RAW.timeline),
  };

  cachedData = data;
  return data;
};

export const clearRegulationCache = (): void => {
  cachedData = null;
};
