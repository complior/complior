/**
 * SyncDocumentsSchema — canonical contract for POST /api/sync/documents.
 *
 * Winner: Both (already aligned). Added SaaS limits (.max()).
 */
import { z } from 'zod';
import { SYNC_DOC_TYPES } from '../shared/enums.js';

export const SyncDocumentSchema = z.object({
  type: z.enum(SYNC_DOC_TYPES),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  obligationId: z.string().optional(),
  toolSlug: z.string().optional(),
});

export type SyncDocument = z.infer<typeof SyncDocumentSchema>;

export const SyncDocumentsSchema = z.object({
  documents: z.array(SyncDocumentSchema).min(1),
});

export type SyncDocumentsPayload = z.infer<typeof SyncDocumentsSchema>;
