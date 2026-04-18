/**
 * @complior/contracts — shared sync API schemas between complior CLI and PROJECT SaaS.
 *
 * Usage:
 *   import { SyncPassportSchema } from '@complior/contracts';
 *   import { SyncScanSchema } from '@complior/contracts/sync';
 *   import { RISK_LEVELS } from '@complior/contracts/shared';
 */

// Re-export everything from sync
export {
  SyncPassportSchema,
  SyncScanSchema,
  SyncDocumentSchema,
  SyncDocumentsSchema,
  SyncFriaSchema,
  SyncFindingSchema,
  SyncToolDetectedSchema,
  GeneralInfoSchema,
  AffectedPersonsSchema,
  SpecificRisksSchema,
  HumanOversightSchema,
  MitigationMeasuresSchema,
  MonitoringPlanSchema,
} from './sync/index.js';

export type {
  SyncPassportPayload,
  SyncScanPayload,
  SyncDocument,
  SyncDocumentsPayload,
  SyncFriaPayload,
  SyncFinding,
  SyncToolDetected,
} from './sync/index.js';

// Re-export shared enums
export {
  RISK_LEVELS,
  AUTONOMY_LEVELS,
  LIFECYCLE_STATUSES,
  AGENT_TYPES,
  SEVERITIES,
  DOC_QUALITIES,
  SYNC_DOC_TYPES,
  DOMAINS,
  PII_HANDLING_MODES,
  ESCALATION_ACTIONS,
} from './shared/index.js';

export type {
  RiskLevel,
  AutonomyLevel,
  LifecycleStatus,
  AgentType,
  Severity,
  DocQuality,
  SyncDocType,
  Domain,
  PiiHandlingMode,
  EscalationAction,
} from './shared/index.js';
