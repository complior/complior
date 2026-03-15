import { z } from 'zod';
import type { Finding } from '../../types/common.types.js';
import type { ScanContext } from '../../ports/scanner.port.js';

/**
 * Manual attestation entry — for checks that cannot be code-verified.
 * Stored in `.complior/attestations.json`.
 */
export interface Attestation {
  readonly checkId: string;
  readonly attested: boolean;
  readonly attestedBy: string;
  readonly attestedAt: string;
  readonly expiresAt?: string;
  readonly evidence?: string;
  readonly notes?: string;
}

const AttestationSchema = z.object({
  checkId: z.string().min(1),
  attested: z.boolean(),
  attestedBy: z.string().min(1),
  attestedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  evidence: z.string().optional(),
  notes: z.string().optional(),
});

const AttestationsFileSchema = z.object({
  attestations: z.array(AttestationSchema),
});

export type AttestationsFile = z.infer<typeof AttestationsFileSchema>;

const ATTESTATIONS_PATH = '.complior/attestations.json';

/** Default attestation validity period: 12 months. */
const DEFAULT_EXPIRY_MONTHS = 12;

const isExpired = (att: Attestation, now: Date): boolean => {
  if (att.expiresAt) {
    return new Date(att.expiresAt) <= now;
  }
  // No explicit expiry → default 12 months from attestedAt
  const attDate = new Date(att.attestedAt);
  attDate.setMonth(attDate.getMonth() + DEFAULT_EXPIRY_MONTHS);
  return attDate <= now;
};

/**
 * Load attestations from scan context files with Zod validation.
 */
const loadAttestations = (ctx: ScanContext): ReadonlyMap<string, Attestation> => {
  const attestationFile = ctx.files.find((f) => f.relativePath === ATTESTATIONS_PATH);
  if (!attestationFile) return new Map();

  try {
    const raw = JSON.parse(attestationFile.content);
    const parsed = AttestationsFileSchema.parse(raw);

    const now = new Date();
    const map = new Map<string, Attestation>();
    for (const att of parsed.attestations) {
      if (att.attested && !isExpired(att, now)) {
        map.set(att.checkId, att);
      }
    }
    return map;
  } catch {
    return new Map();
  }
};

/**
 * Apply manual attestations to findings: convert matching `fail` results to `pass`
 * when a valid, non-expired attestation exists. Attested findings are marked with a note.
 */
export const applyAttestations = (
  findings: readonly Finding[],
  ctx: ScanContext,
): readonly Finding[] => {
  const attestations = loadAttestations(ctx);
  if (attestations.size === 0) return findings;

  return findings.map((f) => {
    if (f.type !== 'fail') return f;

    const att = attestations.get(f.checkId);
    if (!att) return f;

    return {
      ...f,
      type: 'pass' as const,
      message: `${f.message} [manually attested by ${att.attestedBy} on ${att.attestedAt}]`,
    };
  });
};
