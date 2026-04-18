// ─── Sync schemas — re-exports ──────────────────────────────────────

export { SyncPassportSchema } from './passport.schema.js';
export type { SyncPassportPayload } from './passport.schema.js';

export { SyncScanSchema } from './scan.schema.js';
export type { SyncScanPayload } from './scan.schema.js';

export { SyncDocumentSchema, SyncDocumentsSchema } from './documents.schema.js';
export type { SyncDocument, SyncDocumentsPayload } from './documents.schema.js';

export { SyncFriaSchema } from './fria.schema.js';
export type { SyncFriaPayload } from './fria.schema.js';
export {
  GeneralInfoSchema,
  AffectedPersonsSchema,
  SpecificRisksSchema,
  HumanOversightSchema,
  MitigationMeasuresSchema,
  MonitoringPlanSchema,
} from './fria.schema.js';

export { SyncFindingSchema, SyncToolDetectedSchema } from './common.schema.js';
export type { SyncFinding, SyncToolDetected } from './common.schema.js';
