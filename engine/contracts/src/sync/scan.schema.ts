/**
 * SyncScanSchema — canonical contract for POST /api/sync/scan.
 *
 * Winner: CLI (uses `checkId`, more descriptive than SaaS `tool`).
 * SaaS `tool` field will be mapped in SaaS migration milestone.
 * Added: `securityScore`, `tier` fields from CLI.
 */
import { z } from 'zod';
import { SyncFindingSchema, SyncToolDetectedSchema } from './common.schema.js';

export const SyncScanSchema = z.object({
  projectPath: z.string().min(1).max(1000),
  score: z.number().min(0).max(100).optional(),
  securityScore: z.number().min(0).max(100).optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  findings: z.array(SyncFindingSchema),
  toolsDetected: z.array(SyncToolDetectedSchema).min(1),
});

export type SyncScanPayload = z.infer<typeof SyncScanSchema>;
