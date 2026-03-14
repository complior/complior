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
  readonly evidence?: string;
  readonly notes?: string;
}

export interface AttestationsFile {
  readonly attestations: readonly Attestation[];
}

const ATTESTATIONS_PATH = '.complior/attestations.json';

/**
 * Load attestations from scan context files.
 */
const loadAttestations = (ctx: ScanContext): ReadonlyMap<string, Attestation> => {
  const attestationFile = ctx.files.find((f) => f.relativePath === ATTESTATIONS_PATH);
  if (!attestationFile) return new Map();

  try {
    const parsed = JSON.parse(attestationFile.content) as AttestationsFile;
    if (!Array.isArray(parsed.attestations)) return new Map();

    const map = new Map<string, Attestation>();
    for (const att of parsed.attestations) {
      if (att.checkId && att.attested) {
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
 * when a valid attestation exists. Attested findings are marked with a note.
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
