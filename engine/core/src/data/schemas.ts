// Barrel re-export — keeps all existing `from './schemas.js'` imports working
export {
  VersionSchema,
  ObligationsFileSchema,
  TechnicalRequirementsFileSchema,
  ScoringFileSchema,
  type ObligationsFile,
  type TechnicalRequirementsFile,
  type ScoringFile,
  type Obligation,
  type TechnicalRequirement,
  type ScoringData,
  type WeightedCategory,
  type DomainCategory,
} from './schemas-core.js';

export {
  RegulationMetaFileSchema,
  ApplicabilityTreeFileSchema,
  CrossMappingFileSchema,
  LocalizationFileSchema,
  TimelineFileSchema,
  type RegulationMetaFile,
  type ApplicabilityTreeFile,
  type CrossMappingFile,
  type LocalizationFile,
  type TimelineFile,
} from './schemas-supplementary.js';
