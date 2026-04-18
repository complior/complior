/**
 * Sync Contract — re-exports from @complior/contracts (single source of truth).
 *
 * All sync schemas are now defined in @complior/contracts package.
 * This file re-exports them so existing imports throughout engine/core
 * continue to work without changes.
 *
 * @see engine/contracts/src/sync/ for canonical schema definitions
 */

// ─── Schema re-exports ──────────────────────────────────────────────

export {
  SyncPassportSchema,
  SyncScanSchema,
  SyncDocumentSchema,
  SyncDocumentsSchema,
  SyncFriaSchema,
  SyncFindingSchema,
  SyncToolDetectedSchema,
} from '@complior/contracts/sync';

// ─── Type re-exports ────────────────────────────────────────────────

export type {
  SyncPassportPayload,
  SyncScanPayload,
  SyncDocumentsPayload,
  SyncFriaPayload,
  SyncFinding,
  SyncToolDetected,
  SyncDocument,
} from '@complior/contracts/sync';
