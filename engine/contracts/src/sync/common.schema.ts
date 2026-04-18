/**
 * Common sync sub-schemas — shared between multiple endpoints.
 */
import { z } from 'zod';
import { SEVERITIES, DOC_QUALITIES } from '../shared/enums.js';

// ─── SyncFindingSchema ──────────────────────────────────────────────

export const SyncFindingSchema = z.object({
  checkId: z.string().optional(),
  severity: z.enum(SEVERITIES),
  message: z.string(),
  file: z.string().optional(),
  line: z.number().int().optional(),
  obligationId: z.string().optional(),
  articleReference: z.string().optional(),
  fix: z.string().optional(),
  agentId: z.string().optional(),
  docQuality: z.enum(DOC_QUALITIES).optional(),
  l5Analyzed: z.boolean().optional(),
});

export type SyncFinding = z.infer<typeof SyncFindingSchema>;

// ─── SyncToolDetectedSchema ─────────────────────────────────────────

export const SyncToolDetectedSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
  vendor: z.string().optional(),
  category: z.string().optional(),
});

export type SyncToolDetected = z.infer<typeof SyncToolDetectedSchema>;
